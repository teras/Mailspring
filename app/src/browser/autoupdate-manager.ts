/* eslint global-require: 0*/
import { dialog, nativeImage } from 'electron';
import { EventEmitter } from 'events';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { localized } from '../intl';

let autoUpdater = null;

const IdleState = 'idle';
const CheckingState = 'checking';
const DownloadingState = 'downloading';
const UpdateAvailableState = 'update-available';
const NoUpdateAvailableState = 'no-update-available';
const UnsupportedState = 'unsupported';
const ErrorState = 'error';
const preferredChannel = 'stable';

export default class AutoUpdateManager extends EventEmitter {
  state = IdleState;
  version: string;
  config: import('../config').default;
  specMode: boolean;
  preferredChannel: string;
  feedURL: string;
  releaseNotes: string;
  releaseVersion: string;

  constructor(version, config, specMode) {
    super();

    this.version = version;
    this.config = config;
    this.specMode = specMode;
    this.preferredChannel = preferredChannel;

    this.updateFeedURL();
    this.config.onDidChange('identity.id', this.updateFeedURL);

    setTimeout(() => this.setupAutoUpdater(), 0);
  }

  updateFeedURL = () => {
    const params = {
      platform: process.platform,
      arch: process.arch,
      version: this.version,
      id: this.config.get('identity.id') || 'anonymous',
      channel: this.preferredChannel,
    };

    // If we're on the x64 Mac build, but the machine has an Apple-branded
    // processor, switch the user to the arm64 build.
    if (params.platform === 'darwin' && process.arch === 'x64') {
      const cpus = os.cpus();
      if (cpus.length && cpus[0].model.startsWith('Apple ')) {
        params.arch = 'arm64';
      }
    }

    let host = `updates.getmailspring.com`;
    if (this.config.get('env') === 'staging') {
      host = `updates-staging.getmailspring.com`;
    }

    this.feedURL = `https://${host}/check/${params.platform}/${params.arch}/${params.version}/${params.id}/${params.channel}`;
    if (autoUpdater) {
      autoUpdater.setFeedURL(this.feedURL);
    }
  };

  setupAutoUpdater() {
    // DISABLED: Auto-update removed for local-only client
    this.setState(UnsupportedState);
    return;
  }

  emitUpdateAvailableEvent() {
    if (!this.releaseVersion) {
      return;
    }
    global.application.windowManager.sendToAllWindows(
      'update-available',
      {},
      this.getReleaseDetails()
    );
  }

  setState(state) {
    if (this.state === state) {
      return;
    }
    this.state = state;
    this.emit('state-changed', this.state);
  }

  getState() {
    return this.state;
  }

  getReleaseDetails() {
    return {
      releaseVersion: this.releaseVersion,
      releaseNotes: this.releaseNotes,
    };
  }

  check({ hidePopups }: { hidePopups?: boolean } = {}) {
    this.updateFeedURL();
    if (!hidePopups) {
      autoUpdater.once('update-not-available', this.onUpdateNotAvailable);
      autoUpdater.once('error', this.onUpdateError);
    }
    autoUpdater.checkForUpdates();
  }

  install() {
    autoUpdater.quitAndInstall();
  }

  dialogIcon() {
    const iconPath = path.join(
      global.application.resourcePath,
      'static',
      'images',
      'mailspring.png'
    );
    if (!fs.existsSync(iconPath)) return undefined;
    return nativeImage.createFromPath(iconPath);
  }

  onUpdateNotAvailable = () => {
    autoUpdater.removeListener('error', this.onUpdateError);
    dialog.showMessageBox({
      type: 'info',
      buttons: [localized('OK')],
      icon: this.dialogIcon(),
      message: localized('No update available.'),
      title: localized('No update available.'),
      detail: localized(`You're running the latest version of Mailspring (%@).`, this.version),
    });
  };

  onUpdateError = (event, message) => {
    autoUpdater.removeListener('update-not-available', this.onUpdateNotAvailable);
    dialog.showMessageBox({
      type: 'warning',
      buttons: [localized('OK')],
      icon: this.dialogIcon(),
      message: localized('There was an error checking for updates.'),
      title: localized('Update Error'),
      detail: message,
    });
  };
}
