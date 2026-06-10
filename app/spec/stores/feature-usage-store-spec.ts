import { Actions } from 'mailspring-exports';
import { FeatureUsageStore } from '../../src/flux/stores/feature-usage-store';

// In this fork, feature gating is disabled (local-only client): every feature
// is always usable, usage is never tracked or synced, and the upgrade modal
// is never shown.
describe('FeatureUsageStore', function featureUsageStoreSpec() {
  describe('isUsable', () => {
    it('returns true for any feature', () => {
      expect(FeatureUsageStore.isUsable('is-usable')).toBe(true);
      expect(FeatureUsageStore.isUsable('not-usable')).toBe(true);
      expect(FeatureUsageStore.isUsable('unsupported')).toBe(true);
    });
  });

  describe('markUsed', () => {
    it('does not queue a sync task', () => {
      spyOn(Actions, 'queueTask');
      FeatureUsageStore.markUsed('is-usable');
      expect(Actions.queueTask).not.toHaveBeenCalled();
    });
  });

  describe('markUsedOrUpgrade', () => {
    it('resolves without showing the upgrade modal', async () => {
      spyOn(Actions, 'openModal');
      await FeatureUsageStore.markUsedOrUpgrade('not-usable', {
        headerText: 'all test used',
        rechargeText: 'add a test to',
        iconUrl: 'icon url',
      } as any);
      expect(Actions.openModal).not.toHaveBeenCalled();
    });
  });
});
