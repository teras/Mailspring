import React, { Component } from 'react';
import { localized } from 'mailspring-exports';
import { RetinaImg, Flexbox, EditableList } from 'mailspring-component-kit';

export interface CardDAVSource {
  id: string;
  name: string;
  url: string;
  username: string;
  enabled: boolean;
}

interface PreferencesContactSourceListProps {
  sources: CardDAVSource[];
  selected: CardDAVSource | null;
  onAddSource: () => void;
  onSelectSource: (source: CardDAVSource) => void;
  onRemoveSource: (source: CardDAVSource) => void;
}

class PreferencesContactSourceList extends Component<PreferencesContactSourceListProps> {
  _renderSource = (source: CardDAVSource) => {
    return (
      <div className="contact-source" key={source.id}>
        <Flexbox direction="row" style={{ alignItems: 'middle' }}>
          <div style={{ textAlign: 'center' }}>
            <RetinaImg
              style={{ width: 50, height: 50 }}
              name="ic-settings-account-imap.png"
              mode={RetinaImg.Mode.ContentPreserve}
            />
          </div>
          <div style={{ flex: 1, marginLeft: 10, marginRight: 10 }}>
            <div className="source-name" dir="auto">
              {source.name || localized('New CardDAV Source')}
            </div>
            <div className="source-subtext" dir="auto">
              {source.url || localized('No URL configured')}
            </div>
          </div>
          {!source.enabled && (
            <div style={{ color: '#999', fontSize: 11 }}>
              {localized('Disabled')}
            </div>
          )}
        </Flexbox>
      </div>
    );
  };

  render() {
    if (!this.props.sources) {
      return <div className="contact-source-list" />;
    }
    return (
      <EditableList
        className="contact-source-list"
        items={this.props.sources}
        itemContent={this._renderSource}
        selected={this.props.selected}
        onCreateItem={this.props.onAddSource}
        onSelectItem={this.props.onSelectSource}
        onDeleteItem={this.props.onRemoveSource}
      />
    );
  }
}

export default PreferencesContactSourceList;
