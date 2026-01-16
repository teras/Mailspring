import React from 'react';
import {
  Thread,
  Message,
  Contact,
  Utils,
  DatabaseStore,
  Actions,
  ContactAvatarService,
} from 'mailspring-exports';

interface Props {
  thread: Thread;
}

interface State {
  contact: Contact | null;
  avatarUrl: string | null;
}

// Cache for thread -> contact mapping
const contactCache: Record<string, Contact | null> = {};

export default class ThreadListAvatar extends React.Component<Props, State> {
  static displayName = 'ThreadListAvatar';

  state: State = { contact: null, avatarUrl: null };
  _mounted = false;
  _unlisten: (() => void) | null = null;

  componentDidMount() {
    this._mounted = true;
    this.loadContact();
    // Listen for CardDAV sync completion to refresh photos
    this._unlisten = Actions.externalCardDAVSyncResult.listen(this._onCardDAVSync, this);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.thread.id !== this.props.thread.id) {
      this.loadContact();
    }
  }

  componentWillUnmount() {
    this._mounted = false;
    if (this._unlisten) {
      this._unlisten();
    }
  }

  _onCardDAVSync = () => {
    // Clear avatar cache and reload
    ContactAvatarService.clearAvatarCache();
    this.setState({ avatarUrl: null }, () => {
      this.loadAvatar();
    });
  };

  async loadContact() {
    const { thread } = this.props;
    const cacheKey = thread.id;

    // Check cache first
    if (cacheKey in contactCache) {
      const contact = contactCache[cacheKey];
      if (this._mounted) {
        this.setState({ contact }, () => this.loadAvatar());
      }
      return;
    }

    // Get the FIRST message of the thread
    const messages = await DatabaseStore.findAll<Message>(Message)
      .where({ threadId: thread.id })
      .order(Message.attributes.date.ascending())
      .limit(1);

    if (!this._mounted) return;

    let contact: Contact | null = null;
    if (messages.length > 0) {
      const firstMessage = messages[0];
      const sender = firstMessage.from?.[0];
      const iAmSender = sender?.isMe();

      if (iAmSender) {
        // I sent this message - look for recipients
        const toRecipients = (firstMessage.to || []).filter(c => !c.isMe());
        if (toRecipients.length > 0) {
          contact = toRecipients[0];
        } else {
          const ccRecipients = (firstMessage.cc || []).filter(c => !c.isMe());
          if (ccRecipients.length > 0) {
            contact = ccRecipients[0];
          } else {
            contact = sender;
          }
        }
      } else {
        contact = sender || null;
      }
    }

    // Fallback to participants if message fields are empty
    if (!contact && thread.participants?.length > 0) {
      contact = thread.participants.find(p => !p.isMe()) || thread.participants[0];
    }

    contactCache[cacheKey] = contact;
    if (this._mounted) {
      this.setState({ contact }, () => this.loadAvatar());
    }
  }

  async loadAvatar() {
    const { contact } = this.state;
    if (!contact?.email) return;

    // Use centralized avatar service
    const result = await ContactAvatarService.getBestAvatar(contact.email);

    if (this._mounted) {
      this.setState({ avatarUrl: result.url });
    }
  }

  render() {
    const { contact, avatarUrl } = this.state;
    if (!contact?.email) return null;

    const email = contact.email.toLowerCase().trim();
    const hue = Utils.hueForString(email);
    const initials = contact.nameAbbreviation ? contact.nameAbbreviation() : email[0].toUpperCase();

    // Show avatar if available, otherwise show initials
    if (avatarUrl) {
      return (
        <div
          className="thread-list-avatar"
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            marginTop: 4,
            backgroundImage: `url("${avatarUrl}")`,
            backgroundSize: 'cover',
          }}
        />
      );
    }

    return (
      <div
        className="thread-list-avatar"
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: `hsl(${hue}, 50%, 45%)`,
          marginTop: 4,
          fontSize: 11,
          fontWeight: 500,
          color: 'white',
          lineHeight: '24px',
          textAlign: 'center',
        }}
      >
        {initials}
      </div>
    );
  }
}
