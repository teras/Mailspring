import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import { localized, KeyManager, Actions } from 'mailspring-exports';
import { CardDAVSource } from './preferences-contact-source-list';

interface PreferencesContactSourceDetailsProps {
  source: CardDAVSource | null;
  onSourceUpdated: (source: CardDAVSource, updates: Partial<CardDAVSource>) => void;
}

interface PreferencesContactSourceDetailsState {
  source: CardDAVSource | null;
  password: string;
  testingConnection: boolean;
  connectionStatus: 'none' | 'success' | 'error';
  fetching: boolean;
  fetchStatus: 'none' | 'success' | 'error';
  fetchResult: { contactCount: number; error?: string } | null;
  discovering: boolean;
  discoverStatus: 'none' | 'success' | 'error';
}

class PreferencesContactSourceDetails extends Component<
  PreferencesContactSourceDetailsProps,
  PreferencesContactSourceDetailsState
> {
  _unlisten: (() => void) | null = null;

  constructor(props: PreferencesContactSourceDetailsProps) {
    super(props);
    this.state = {
      source: props.source ? { ...props.source } : null,
      password: '',
      testingConnection: false,
      connectionStatus: 'none',
      fetching: false,
      fetchStatus: 'none',
      fetchResult: null,
      discovering: false,
      discoverStatus: 'none',
    };
  }

  componentDidMount() {
    this._loadPassword();
    this._unlisten = Actions.externalCardDAVSyncResult.listen(this._onFetchResult, this);
  }

  componentWillUnmount() {
    if (this._unlisten) {
      this._unlisten();
    }
  }

  _onFetchResult = (result: { sourceId: string; success: boolean; contactCount: number; error?: string }) => {
    // Only handle result for the currently selected source
    if (result.sourceId !== this.props.source?.id) return;

    this.setState({
      fetching: false,
      fetchStatus: result.success ? 'success' : 'error',
      fetchResult: result,
    });
  };

  componentDidUpdate(prevProps: PreferencesContactSourceDetailsProps) {
    if (prevProps.source?.id !== this.props.source?.id) {
      this.setState(
        {
          source: this.props.source ? { ...this.props.source } : null,
          password: '',
          connectionStatus: 'none',
          fetchStatus: 'none',
          fetchResult: null,
          discoverStatus: 'none',
        },
        () => this._loadPassword()
      );
    }
  }

  async _loadPassword() {
    if (!this.props.source?.id) return;
    try {
      const password = await KeyManager.getPassword(`carddav.${this.props.source.id}`);
      this.setState({ password: password || '' });
    } catch (e) {
      this.setState({ password: '' });
    }
  }

  _saveChanges = () => {
    if (this.state.source && this.props.source) {
      this.props.onSourceUpdated(this.props.source, this.state.source);
    }
  };

  _savePassword = async () => {
    if (!this.props.source?.id) return;
    if (this.state.password) {
      await KeyManager.replacePassword(`carddav.${this.props.source.id}`, this.state.password);
    } else {
      await KeyManager.deletePassword(`carddav.${this.props.source.id}`);
    }
  };

  _setState = (updates: Partial<CardDAVSource>) => {
    this.setState(state => ({
      source: state.source ? { ...state.source, ...updates } : null,
    }));
  };

  _testConnection = async () => {
    const { source, password } = this.state;
    if (!source?.url || !source?.username) {
      this.setState({ connectionStatus: 'error' });
      return;
    }

    this.setState({ testingConnection: true, connectionStatus: 'none' });

    try {
      const response = await fetch(source.url, {
        method: 'PROPFIND',
        headers: {
          Authorization: 'Basic ' + btoa(`${source.username}:${password}`),
          Depth: '0',
          'Content-Type': 'application/xml',
        },
      });

      if (response.status === 207) {
        this.setState({ connectionStatus: 'success' });
      } else {
        this.setState({ connectionStatus: 'error' });
      }
    } catch (e) {
      this.setState({ connectionStatus: 'error' });
    } finally {
      this.setState({ testingConnection: false });
    }
  };

  _fetchContacts = () => {
    const { source, password } = this.state;
    if (!source?.url || !source?.username || !source?.enabled) {
      this.setState({ fetchStatus: 'error', fetchResult: { contactCount: 0, error: 'Missing configuration' } });
      return;
    }

    this.setState({ fetching: true, fetchStatus: 'none', fetchResult: null });

    // Send fetch request to the main process which will forward to mailsync
    // The result will come back via Actions.externalCardDAVSyncResult
    ipcRenderer.send('run-external-carddav-sync', {
      id: source.id,
      name: source.name,
      url: source.url,
      username: source.username,
      password: password,
    });
  };

  _discoverCardDAV = async () => {
    const { source, password } = this.state;
    if (!source?.username) {
      this.setState({ discoverStatus: 'error' });
      return;
    }

    this.setState({ discovering: true, discoverStatus: 'none' });

    // Extract domain from username if it looks like an email
    let domain = '';
    if (source.username.includes('@')) {
      domain = source.username.split('@')[1];
    } else if (source.url) {
      // Try to extract domain from existing URL
      try {
        domain = new URL(source.url).hostname;
      } catch {
        this.setState({ discovering: false, discoverStatus: 'error' });
        return;
      }
    } else {
      this.setState({ discovering: false, discoverStatus: 'error' });
      return;
    }

    try {
      // Try .well-known/carddav endpoint
      const wellKnownUrl = `https://${domain}/.well-known/carddav`;
      const response = await fetch(wellKnownUrl, {
        method: 'PROPFIND',
        headers: {
          Authorization: 'Basic ' + btoa(`${source.username}:${password}`),
          Depth: '0',
          'Content-Type': 'application/xml',
        },
        redirect: 'follow',
      });

      if (response.ok || response.status === 207) {
        // Success - use the redirected URL or the original
        const discoveredUrl = response.url || wellKnownUrl;
        this._setState({ url: discoveredUrl });
        setTimeout(this._saveChanges, 0);
        this.setState({ discovering: false, discoverStatus: 'success' });
        return;
      }

      // Try common CardDAV paths
      const commonPaths = [
        `/remote.php/dav/addressbooks/users/${source.username}/`,
        `/dav/addressbooks/users/${source.username}/`,
        `/addressbooks/${source.username}/`,
        '/carddav/',
      ];

      for (const path of commonPaths) {
        const testUrl = `https://${domain}${path}`;
        try {
          const testResponse = await fetch(testUrl, {
            method: 'PROPFIND',
            headers: {
              Authorization: 'Basic ' + btoa(`${source.username}:${password}`),
              Depth: '0',
              'Content-Type': 'application/xml',
            },
          });

          if (testResponse.ok || testResponse.status === 207) {
            this._setState({ url: testUrl });
            setTimeout(this._saveChanges, 0);
            this.setState({ discovering: false, discoverStatus: 'success' });
            return;
          }
        } catch {
          // Continue trying other paths
        }
      }

      this.setState({ discovering: false, discoverStatus: 'error' });
    } catch (e) {
      this.setState({ discovering: false, discoverStatus: 'error' });
    }
  };

  render() {
    const {
      source,
      password,
      testingConnection,
      connectionStatus,
      fetching,
      fetchStatus,
      fetchResult,
      discovering,
      discoverStatus,
    } = this.state;

    if (!source) {
      return (
        <div className="contact-source-details">
          <div className="empty-message">
            {localized('Select a CardDAV source or add a new one to configure it.')}
          </div>
        </div>
      );
    }

    return (
      <div className="contact-source-details">
        <h6>{localized('Display Name')}</h6>
        <input
          type="text"
          value={source.name}
          placeholder={localized('My Contacts')}
          onBlur={this._saveChanges}
          onChange={e => this._setState({ name: e.target.value })}
        />

        <h6>{localized('CardDAV URL')}</h6>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ flex: 1 }}
            type="text"
            value={source.url}
            placeholder="https://example.com/remote.php/dav"
            onBlur={this._saveChanges}
            onChange={e => {
              this._setState({ url: e.target.value });
              if (this.state.discoverStatus !== 'none' || this.state.connectionStatus !== 'none') {
                this.setState({ discoverStatus: 'none', connectionStatus: 'none' });
              }
            }}
          />
          <div
            className="btn"
            onClick={this._discoverCardDAV}
            style={{ opacity: discovering ? 0.5 : 1, flexShrink: 0 }}
            title={localized('Auto-discover CardDAV URL from username domain')}
          >
            {discovering ? '...' : localized('Discover')}
          </div>
        </div>
        {discoverStatus === 'success' && (
          <div style={{ color: '#2ecc71', fontSize: 11, marginTop: 4 }}>
            {localized('URL discovered successfully')}
          </div>
        )}
        {discoverStatus === 'error' && (
          <div style={{ color: '#e74c3c', fontSize: 11, marginTop: 4 }}>
            {localized('Could not auto-discover URL. Please enter manually.')}
          </div>
        )}

        <h6>{localized('Username')}</h6>
        <input
          type="text"
          value={source.username}
          placeholder={localized('username')}
          onBlur={this._saveChanges}
          onChange={e => {
            this._setState({ username: e.target.value });
            if (this.state.connectionStatus !== 'none') {
              this.setState({ connectionStatus: 'none' });
            }
          }}
        />

        <h6>{localized('Password')}</h6>
        <input
          type="password"
          value={password}
          placeholder="********"
          onBlur={this._savePassword}
          onChange={e => {
            this.setState({ password: e.target.value });
            if (this.state.connectionStatus !== 'none') {
              this.setState({ connectionStatus: 'none' });
            }
          }}
        />

        <h6>{localized('Status')}</h6>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <input
              type="checkbox"
              checked={source.enabled}
              onChange={e => {
                this._setState({ enabled: e.target.checked });
                setTimeout(this._saveChanges, 0);
              }}
            />
            {localized('Enabled')}
          </label>
        </div>

        <h6>{localized('Connection')}</h6>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="btn"
            onClick={this._testConnection}
            style={{ opacity: testingConnection ? 0.5 : 1 }}
          >
            {testingConnection ? localized('Testing...') : localized('Test Connection')}
          </div>
          {connectionStatus === 'success' && (
            <span style={{ color: '#2ecc71' }}>{localized('Connection successful')}</span>
          )}
          {connectionStatus === 'error' && (
            <span style={{ color: '#e74c3c' }}>{localized('Connection failed')}</span>
          )}
        </div>

        <h6>{localized('Contacts')}</h6>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="btn"
            onClick={this._fetchContacts}
            style={{ opacity: fetching || !source.enabled ? 0.5 : 1 }}
          >
            {fetching ? localized('Fetching...') : localized('Fetch Contacts')}
          </div>
          {fetchStatus === 'success' && fetchResult && (
            <span style={{ color: '#2ecc71' }}>
              {localized('%@ contacts', fetchResult.contactCount)}
            </span>
          )}
          {fetchStatus === 'error' && (
            <span style={{ color: '#e74c3c' }}>
              {fetchResult?.error || localized('Fetch failed')}
            </span>
          )}
        </div>
      </div>
    );
  }
}

export default PreferencesContactSourceDetails;
