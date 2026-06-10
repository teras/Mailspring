import moment from 'moment';
import {
  Actions,
  TaskQueue,
  TaskFactory,
  DatabaseStore,
  Folder,
  Thread,
  FolderSyncProgressStore,
} from 'mailspring-exports';
import * as SnoozeUtils from '../lib/snooze-utils';

xdescribe('Snooze Utils', function snoozeUtils() {
  beforeEach(() => {
    this.name = 'Snoozed Folder';
    this.accId = 123;
    spyOn(FolderSyncProgressStore, 'whenCategoryListSynced').andReturn(Promise.resolve());
  });

  describe('snoozedUntilMessage', () => {
    it('returns correct message if no snooze date provided', () => {
      expect(SnoozeUtils.snoozedUntilMessage()).toEqual('Snoozed');
    });

    describe('when less than 24 hours from now', () => {
      it('returns correct message if snoozeDate is on the hour of the clock', () => {
        const now9AM = window
          .testNowMoment()
          .hour(9)
          .minute(0);
        const tomorrowAt8 = moment(now9AM)
          .add(1, 'day')
          .hour(8);
        const result = SnoozeUtils.snoozedUntilMessage(tomorrowAt8, now9AM);
        expect(result).toEqual('Snoozed until 8 AM');
      });

      it('returns correct message if snoozeDate otherwise', () => {
        const now9AM = window
          .testNowMoment()
          .hour(9)
          .minute(0);
        const snooze10AM = moment(now9AM)
          .hour(10)
          .minute(5);
        const result = SnoozeUtils.snoozedUntilMessage(snooze10AM, now9AM);
        expect(result).toEqual('Snoozed until 10:05 AM');
      });
    });

    describe('when more than 24 hourse from now', () => {
      it('returns correct message if snoozeDate is on the hour of the clock', () => {
        // Jan 1
        const now9AM = window
          .testNowMoment()
          .month(0)
          .date(1)
          .hour(9)
          .minute(0);
        const tomorrowAt10 = moment(now9AM)
          .add(1, 'day')
          .hour(10);
        const result = SnoozeUtils.snoozedUntilMessage(tomorrowAt10, now9AM);
        expect(result).toEqual('Snoozed until Jan 2, 10 AM');
      });

      it('returns correct message if snoozeDate otherwise', () => {
        // Jan 1
        const now9AM = window
          .testNowMoment()
          .month(0)
          .date(1)
          .hour(9)
          .minute(0);
        const tomorrowAt930 = moment(now9AM)
          .add(1, 'day')
          .minute(30);
        const result = SnoozeUtils.snoozedUntilMessage(tomorrowAt930, now9AM);
        expect(result).toEqual('Snoozed until Jan 2, 9:30 AM');
      });
    });
  });

});
