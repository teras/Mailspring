import { ComposerExtension, FeatureUsageStore, Message, Contact } from 'mailspring-exports';
import qs from 'querystring';

import { PLUGIN_ID, PLUGIN_URL } from './open-tracking-constants';
import { OpenTrackingMetadata } from './types';

export default class OpenTrackingComposerExtension extends ComposerExtension {
  static needsPerRecipientBodies(draft) {
    return !draft.plaintext && !!draft.metadataForPluginId(PLUGIN_ID);
  }

  static applyTransformsForSending({
    draftBodyRootNode,
    draft,
    recipient,
  }: {
    draftBodyRootNode: HTMLElement;
    draft: Message;
    recipient?: Contact;
  }) {
    // DISABLED: Open tracking removed for local-only client
    // This feature requires remote server to track email opens
    return;
  }

  static onSendSuccess(draft) {
    const metadata = draft.metadataForPluginId(PLUGIN_ID);
    if (metadata) {
      FeatureUsageStore.markUsed(PLUGIN_ID);
    }
  }
}
