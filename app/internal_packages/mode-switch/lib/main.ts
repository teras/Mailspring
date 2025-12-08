import { localized, ComponentRegistry, WorkspaceStore } from 'mailspring-exports';
import { HasTutorialTip } from 'mailspring-component-kit';

import ModeToggle from './mode-toggle';

const ToggleWithTutorialTip = HasTutorialTip(ModeToggle, {
  title: localized('Contact sidebar'),
  instructions: localized(
    'Click to show or hide the sidebar. The sidebar displays contact information including their Gravatar photo and related threads from your conversations.'
  ),
});

// NOTE: this is a hack to allow ComponentRegistry
// to register the same component multiple times in
// different areas. if we do this more than once, let's
// dry this out.
class ToggleWithTutorialTipList extends ToggleWithTutorialTip {
  static displayName = 'ModeToggleList';
}

export function activate() {
  ComponentRegistry.register(ToggleWithTutorialTipList, {
    location: WorkspaceStore.Sheet.Thread.Toolbar.Right,
    modes: ['list'],
  });

  ComponentRegistry.register(ToggleWithTutorialTip, {
    location: WorkspaceStore.Sheet.Threads.Toolbar.Right,
    modes: ['split', 'splitVertical'],
  });
}

export function deactivate() {
  ComponentRegistry.unregister(ToggleWithTutorialTip);
  ComponentRegistry.unregister(ToggleWithTutorialTipList);
}
