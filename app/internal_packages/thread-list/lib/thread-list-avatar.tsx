import React from 'react';
import crypto from 'crypto';
import {
  Thread,
  Message,
  Contact,
  Utils,
  DatabaseStore,
} from 'mailspring-exports';

interface Props {
  thread: Thread;
}

interface State {
  contact: Contact | null;
  gravatarLoaded: boolean;
}

// Cache for gravatar load results
const gravatarCache: Record<string, boolean> = {};
// Cache for thread -> contact mapping
const contactCache: Record<string, Contact | null> = {};

export default class ThreadListAvatar extends React.Component<Props, State> {
  static displayName = 'ThreadListAvatar';

  state: State = { contact: null, gravatarLoaded: false };
  _mounted = false;

  componentDidMount() {
    this._mounted = true;
    this.loadContact();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.thread.id !== this.props.thread.id) {
      this.loadContact();
    }
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  async loadContact() {
    const { thread } = this.props;
    const cacheKey = thread.id;

    // Check cache first
    if (cacheKey in contactCache) {
      const contact = contactCache[cacheKey];
      if (this._mounted) {
        this.setState({ contact }, () => this.checkGravatar());
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
        // First try TO (excluding myself)
        const toRecipients = (firstMessage.to || []).filter(c => !c.isMe());
        if (toRecipients.length > 0) {
          contact = toRecipients[0];
        } else {
          // Then try CC (excluding myself)
          const ccRecipients = (firstMessage.cc || []).filter(c => !c.isMe());
          if (ccRecipients.length > 0) {
            contact = ccRecipients[0];
          } else {
            // All BCC or sent to myself only - show me
            contact = sender;
          }
        }
      } else {
        // I received this message - show the sender
        contact = sender || null;
      }
    }

    // Fallback to participants if message fields are empty
    if (!contact && thread.participants?.length > 0) {
      contact = thread.participants.find(p => !p.isMe()) || thread.participants[0];
    }

    contactCache[cacheKey] = contact;
    if (this._mounted) {
      this.setState({ contact }, () => this.checkGravatar());
    }
  }


  checkGravatar() {
    const { contact } = this.state;
    if (!contact?.email) return;

    const email = contact.email.toLowerCase().trim();
    const hash = crypto.createHash('md5').update(email).digest('hex');

    // Check cache first
    if (hash in gravatarCache) {
      if (this._mounted) {
        this.setState({ gravatarLoaded: gravatarCache[hash] });
      }
      return;
    }

    const img = new Image();
    img.onload = () => {
      gravatarCache[hash] = true;
      if (this._mounted) {
        this.setState({ gravatarLoaded: true });
      }
    };
    img.onerror = () => {
      gravatarCache[hash] = false;
      if (this._mounted) {
        this.setState({ gravatarLoaded: false });
      }
    };
    img.src = `https://www.gravatar.com/avatar/${hash}?s=48&d=404`;
  }

  render() {
    const { contact, gravatarLoaded } = this.state;
    if (!contact?.email) return null;

    const email = contact.email.toLowerCase().trim();
    const hash = crypto.createHash('md5').update(email).digest('hex');
    const hue = Utils.hueForString(email);
    const initials = contact.nameAbbreviation ? contact.nameAbbreviation() : email[0].toUpperCase();

    if (gravatarLoaded) {
      return (
        <div
          className="thread-list-avatar"
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            marginTop: 4,
            backgroundImage: `url("https://www.gravatar.com/avatar/${hash}?s=48")`,
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
