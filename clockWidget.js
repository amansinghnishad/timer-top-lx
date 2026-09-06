// Focus Timer & Stopwatch - Interactive Digital Clock Widget

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

export const ClockWidget = GObject.registerClass(
class ClockWidget extends St.BoxLayout {
    _init(onTimeChanged) {
        super._init({
            style_class: 'focus-timer-interactive-clock',
            x_align: Clutter.ActorAlign.CENTER,
        });

        this._onTimeChanged = onTimeChanged;
        this._isInteractive = true;

        // 1. Minutes Column
        const minCol = new St.BoxLayout({
            vertical: true,
            style_class: 'focus-timer-time-col',
            x_align: Clutter.ActorAlign.CENTER,
            reactive: true,
        });

        this._minUpBtn = new St.Button({
            child: new St.Icon({
                icon_name: 'go-up-symbolic',
                style_class: 'focus-timer-stepper-icon',
            }),
            style_class: 'focus-timer-stepper-btn',
            can_focus: true,
        });
        this._minUpBtn.connect('clicked', () => this._adjustTime(60));

        this._minEntry = new St.Entry({
            text: '25',
            style_class: 'focus-timer-clock-entry',
            can_focus: true,
        });
        this._minEntry.clutter_text.set_max_length(4);
        this._minEntry.clutter_text.connect('activate', () => this._notifyTimeChanged());
        this._minEntry.connect('key-focus-out', () => this._notifyTimeChanged());

        this._minDownBtn = new St.Button({
            child: new St.Icon({
                icon_name: 'go-down-symbolic',
                style_class: 'focus-timer-stepper-icon',
            }),
            style_class: 'focus-timer-stepper-btn',
            can_focus: true,
        });
        this._minDownBtn.connect('clicked', () => this._adjustTime(-60));

        const minHint = new St.Label({
            text: _('MIN'),
            style_class: 'focus-timer-time-label-hint',
            x_align: Clutter.ActorAlign.CENTER,
        });

        minCol.add_child(this._minUpBtn);
        minCol.add_child(this._minEntry);
        minCol.add_child(this._minDownBtn);
        minCol.add_child(minHint);

        minCol.connect('scroll-event', (actor, event) => {
            if (!this._isInteractive)
                return Clutter.EVENT_PROPAGATE;

            const dir = event.get_scroll_direction();
            if (dir === Clutter.ScrollDirection.UP) {
                this._adjustTime(60);
                return Clutter.EVENT_STOP;
            } else if (dir === Clutter.ScrollDirection.DOWN) {
                this._adjustTime(-60);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // 2. Colon Separator
        const colonBox = new St.BoxLayout({
            vertical: true,
            style_class: 'focus-timer-colon-box',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._colonLabel = new St.Label({
            text: ':',
            style_class: 'focus-timer-clock-colon',
        });
        colonBox.add_child(this._colonLabel);

        // 3. Seconds Column
        const secCol = new St.BoxLayout({
            vertical: true,
            style_class: 'focus-timer-time-col',
            x_align: Clutter.ActorAlign.CENTER,
            reactive: true,
        });

        this._secUpBtn = new St.Button({
            child: new St.Icon({
                icon_name: 'go-up-symbolic',
                style_class: 'focus-timer-stepper-icon',
            }),
            style_class: 'focus-timer-stepper-btn',
            can_focus: true,
        });
        this._secUpBtn.connect('clicked', () => this._adjustTime(5));

        this._secEntry = new St.Entry({
            text: '00',
            style_class: 'focus-timer-clock-entry',
            can_focus: true,
        });
        this._secEntry.clutter_text.set_max_length(2);
        this._secEntry.clutter_text.connect('activate', () => this._notifyTimeChanged());
        this._secEntry.connect('key-focus-out', () => this._notifyTimeChanged());

        this._secDownBtn = new St.Button({
            child: new St.Icon({
                icon_name: 'go-down-symbolic',
                style_class: 'focus-timer-stepper-icon',
            }),
            style_class: 'focus-timer-stepper-btn',
            can_focus: true,
        });
        this._secDownBtn.connect('clicked', () => this._adjustTime(-5));

        const secHint = new St.Label({
            text: _('SEC'),
            style_class: 'focus-timer-time-label-hint',
            x_align: Clutter.ActorAlign.CENTER,
        });

        secCol.add_child(this._secUpBtn);
        secCol.add_child(this._secEntry);
        secCol.add_child(this._secDownBtn);
        secCol.add_child(secHint);

        secCol.connect('scroll-event', (actor, event) => {
            if (!this._isInteractive)
                return Clutter.EVENT_PROPAGATE;

            const dir = event.get_scroll_direction();
            if (dir === Clutter.ScrollDirection.UP) {
                this._adjustTime(5);
                return Clutter.EVENT_STOP;
            } else if (dir === Clutter.ScrollDirection.DOWN) {
                this._adjustTime(-5);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this.add_child(minCol);
        this.add_child(colonBox);
        this.add_child(secCol);
    }

    _notifyTimeChanged() {
        if (!this._isInteractive)
            return;

        const totalSeconds = this.getEnteredSeconds();
        if (this._onTimeChanged)
            this._onTimeChanged(totalSeconds);
    }

    _adjustTime(delta) {
        if (!this._isInteractive)
            return;

        const current = this.getEnteredSeconds();
        const updated = Math.max(10, current + delta);
        this.setDisplay(updated, false);

        if (this._onTimeChanged)
            this._onTimeChanged(updated);
    }

    getEnteredSeconds() {
        let m = parseInt(this._minEntry.get_text(), 10);
        let s = parseInt(this._secEntry.get_text(), 10);

        if (isNaN(m) || m < 0) m = 0;
        if (isNaN(s) || s < 0) s = 0;

        let total = m * 60 + s;
        return total > 0 ? total : 60;
    }

    setDisplay(totalSeconds, isRunning) {
        this._isInteractive = !isRunning;

        const showSteppers = !isRunning;
        this._minUpBtn.visible = showSteppers;
        this._minDownBtn.visible = showSteppers;
        this._secUpBtn.visible = showSteppers;
        this._secDownBtn.visible = showSteppers;

        this._minEntry.clutter_text.set_editable(!isRunning);
        this._secEntry.clutter_text.set_editable(!isRunning);

        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        const mStr = m.toString().padStart(2, '0');
        const sStr = s.toString().padStart(2, '0');

        if (isRunning || (!this._minEntry.has_key_focus() && !this._secEntry.has_key_focus())) {
            this._minEntry.set_text(mStr);
            this._secEntry.set_text(sStr);
        }
    }
});
