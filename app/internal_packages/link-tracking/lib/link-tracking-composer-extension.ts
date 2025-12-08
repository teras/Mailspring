import { ComposerExtension, RegExpUtils, FeatureUsageStore } from 'mailspring-exports';
import { PLUGIN_ID, PLUGIN_URL } from './link-tracking-constants';

function forEachATagInBody(draftBodyRootNode, callback) {
  const treeWalker = document.createTreeWalker(draftBodyRootNode, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node: HTMLElement) => {
      if (node.classList.contains('gmail_quote')) {
        return NodeFilter.FILTER_REJECT; // skips the entire subtree
      }
      return node.hasAttribute('href') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  while (treeWalker.nextNode()) {
    callback(treeWalker.currentNode);
  }
}

/**
 * This replaces all links with a new url that redirects through our
 * cloud-api servers (see cloud-api/routes/link-tracking)
 *
 * This redirect link href is NOT complete at this stage. It requires
 * substantial post processing just before send. This happens in iso-core
 * since sending can happen immediately or later in cloud-workers.
 *
 * See isomorphic-core tracking-utils.ts
 *
 * We also need to add individualized recipients to each tracking pixel
 * for each message sent to each person.
 *
 * We finally need to put the original url back for the message that ends
 * up in the users's sent folder. This ensures the sender doesn't trip
 * their own link tracks.
 */
export default class LinkTrackingComposerExtension extends ComposerExtension {
  static needsPerRecipientBodies(draft) {
    return !draft.plaintext && !!draft.metadataForPluginId(PLUGIN_ID);
  }

  static applyTransformsForSending({ draftBodyRootNode, draft, recipient }) {
    // DISABLED: Link tracking removed for local-only client
    // This feature requires remote server to track link clicks
    return;
  }

  static onSendSuccess(draft) {
    const metadata = draft.metadataForPluginId(PLUGIN_ID);
    if (metadata) {
      FeatureUsageStore.markUsed(PLUGIN_ID);
    }
  }
}
