import React from 'react';
import { localized, Utils } from 'mailspring-exports';
import PreferencesContactSourceList, { CardDAVSource } from './preferences-contact-source-list';
import PreferencesContactSourceDetails from './preferences-contact-source-details';

interface PreferencesContactsState {
  sources: CardDAVSource[];
  selected: CardDAVSource | null;
}

class PreferencesContacts extends React.Component<Record<string, unknown>, PreferencesContactsState> {
  static displayName = 'PreferencesContacts';

  constructor(props: Record<string, unknown>) {
    super(props);
    this.state = this._getStateFromConfig();
  }

  _getStateFromConfig(): PreferencesContactsState {
    const sources = (AppEnv.config.get('core.carddav.sources') as CardDAVSource[]) || [];
    return {
      sources,
      selected: sources.length > 0 ? sources[0] : null,
    };
  }

  _saveSources(sources: CardDAVSource[]) {
    AppEnv.config.set('core.carddav.sources', sources);
    this.setState({ sources });
  }

  _onAddSource = () => {
    const newSource: CardDAVSource = {
      id: Utils.generateTempId(),
      name: '',
      url: '',
      username: '',
      enabled: true,
    };
    const sources = [...this.state.sources, newSource];
    this._saveSources(sources);
    this.setState({ selected: newSource });
  };

  _onSelectSource = (source: CardDAVSource) => {
    this.setState({ selected: source });
  };

  _onRemoveSource = (source: CardDAVSource) => {
    const sources = this.state.sources.filter(s => s.id !== source.id);
    this._saveSources(sources);
    this.setState({
      selected: sources.length > 0 ? sources[0] : null,
    });
  };

  _onSourceUpdated = (source: CardDAVSource, updates: Partial<CardDAVSource>) => {
    const sources = this.state.sources.map(s => (s.id === source.id ? { ...s, ...updates } : s));
    this._saveSources(sources);
    if (this.state.selected?.id === source.id) {
      this.setState({ selected: { ...source, ...updates } });
    }
  };

  render() {
    return (
      <div className="container-contacts">
        <div className="contacts-content">
          <PreferencesContactSourceList
            sources={this.state.sources}
            selected={this.state.selected}
            onAddSource={this._onAddSource}
            onSelectSource={this._onSelectSource}
            onRemoveSource={this._onRemoveSource}
          />
          <PreferencesContactSourceDetails
            source={this.state.selected}
            onSourceUpdated={this._onSourceUpdated}
          />
        </div>
      </div>
    );
  }
}

export default PreferencesContacts;
