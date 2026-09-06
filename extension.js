// Focus Timer & Stopwatch - GNOME Shell Extension Entry Point
// Compatible with GNOME 45, 46, 47, 48, 49, 50

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {FocusTimerIndicator} from './indicator.js';

export default class FocusTimerExtension extends Extension {
    enable() {
        this._indicator = new FocusTimerIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
