import React from 'react';
import crypto from 'crypto';
import { Thread, Utils } from 'mailspring-exports';

interface Props {
  thread: Thread;
}

interface State {
  gravatarLoaded: boolean;
}

// Cache for gravatar load results
const gravatarCache: Record<string, boolean> = {};

export default class ThreadListAvatar extends React.Component<Props, State> {
  static displayName = 'ThreadListAvatar';

  state: State = { gravatarLoaded: false };

  componentDidMount() {
    this.checkGravatar();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.thread.id !== this.props.thread.id) {
      this.checkGravatar();
    }
  }

  checkGravatar() {
    const contact = this.getContact();
    if (!contact?.email) return;

    const email = contact.email.toLowerCase().trim();
    const hash = crypto.createHash('md5').update(email).digest('hex');

    // Check cache first
    if (hash in gravatarCache) {
      this.setState({ gravatarLoaded: gravatarCache[hash] });
      return;
    }

    const img = new Image();
    img.onload = () => {
      gravatarCache[hash] = true;
      this.setState({ gravatarLoaded: true });
    };
    img.onerror = () => {
      gravatarCache[hash] = false;
      this.setState({ gravatarLoaded: false });
    };
    img.src = `https://www.gravatar.com/avatar/${hash}?s=48&d=404`;
  }

  getContact() {
    const participants = this.props.thread.participants || [];
    return participants.find(p => !p.isMe()) || participants[0];
  }

  render() {
    const contact = this.getContact();
    if (!contact?.email) return null;

    const email = contact.email.toLowerCase().trim();
    const hash = crypto.createHash('md5').update(email).digest('hex');
    const hue = Utils.hueForString(email);
    const initials = contact.nameAbbreviation ? contact.nameAbbreviation() : email[0].toUpperCase();

    if (this.state.gravatarLoaded) {
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
