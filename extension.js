// Focus Timer & Stopwatch - GNOME Shell Extension
// Compatible with GNOME 45, 46, 47, 48, 49, 50
// Pure ESM module conforming to extensions.gnome.org guidelines

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const FocusTimerIndicator = GObject.registerClass(
class FocusTimerIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.5, _('Focus Timer'));

        this._extension = extension;
        this._settings = extension.getSettings();

        // Timer state
        this._mode = 'timer'; // 'timer' | 'stopwatch'
        this._timerState = 'stopped'; // 'stopped' | 'running' | 'paused' | 'finished'
        this._timerRemaining = this._settings.get_int('pomodoro-duration') * 60;
        this._timerTotal = this._timerRemaining;

        // Stopwatch state
        this._stopwatchState = 'stopped'; // 'stopped' | 'running' | 'paused'
        this._stopwatchSeconds = 0;
        this._stopwatchLaps = [];

        // GLib interval source ID
        this._intervalId = null;

        // Build Top Bar UI
        this._buildPanelButton();

        // Build Dropdown Menu
        this._buildMenu();

        // Middle-click on top bar for quick Play/Pause toggle
        this.connect('button-press-event', (actor, event) => {
            if (event.get_button() === 2) {
                this._togglePlayPause();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // Scroll to adjust timer minutes on top bar when idle or paused
        this.connect('scroll-event', (actor, event) => {
            if (this._mode !== 'timer' || this._timerState === 'running')
                return Clutter.EVENT_PROPAGATE;

            const direction = event.get_scroll_direction();
            if (direction === Clutter.ScrollDirection.UP) {
                this._adjustMinutes(1);
                return Clutter.EVENT_STOP;
            } else if (direction === Clutter.ScrollDirection.DOWN) {
                this._adjustMinutes(-1);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // Listen for settings changes
        this._settings.connectObject(
            'changed::pomodoro-duration', () => {
                if (this._timerState === 'stopped') {
                    this._timerRemaining = this._settings.get_int('pomodoro-duration') * 60;
                    this._timerTotal = this._timerRemaining;
                    this._updateDisplay();
                }
            },
            'changed::show-seconds-panel', () => this._updatePanelLabel(),
            this
        );

        this._updateDisplay();
    }

    _buildPanelButton() {
        this._panelBox = new St.BoxLayout({
            style_class: 'focus-timer-panel-box',
            reactive: true,
        });

        this._panelIcon = new St.Icon({
            icon_name: 'preferences-system-time-symbolic',
            style_class: 'system-status-icon',
        });

        this._panelLabel = new St.Label({
            text: '25:00',
            style_class: 'focus-timer-panel-label',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._panelBox.add_child(this._panelIcon);
        this._panelBox.add_child(this._panelLabel);
        this.add_child(this._panelBox);
    }

    _buildMenu() {
        const menuItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            activate: false,
            hover: false,
            style_class: 'focus-timer-menu-item',
        });

        const mainContainer = new St.BoxLayout({
            vertical: true,
            style_class: 'focus-timer-menu-box',
            x_expand: true,
        });

        // 1. Mode Switcher (Focus Timer / Stopwatch)
        const switcherBox = new St.BoxLayout({
            style_class: 'focus-timer-mode-switcher',
            x_expand: true,
        });

        this._timerTabBtn = new St.Button({
            label: _('⏱️ Timer'),
            style_class: 'focus-timer-tab focus-timer-tab-active',
            can_focus: true,
            x_expand: true,
        });
        this._timerTabBtn.connect('clicked', () => this._switchMode('timer'));

        this._stopwatchTabBtn = new St.Button({
            label: _('⏱ Stopwatch'),
            style_class: 'focus-timer-tab',
            can_focus: true,
            x_expand: true,
        });
        this._stopwatchTabBtn.connect('clicked', () => this._switchMode('stopwatch'));

        switcherBox.add_child(this._timerTabBtn);
        switcherBox.add_child(this._stopwatchTabBtn);
        mainContainer.add_child(switcherBox);

        // 2. Clock Display & Editor Box
        const clockBox = new St.BoxLayout({
            vertical: true,
            style_class: 'focus-timer-clock-box',
            x_align: Clutter.ActorAlign.CENTER,
        });

        // Interactive Editable Clock Row for Timer
        this._clockRow = new St.BoxLayout({
            style_class: 'focus-timer-interactive-clock',
            x_align: Clutter.ActorAlign.CENTER,
        });

        // Minutes Column (Up Arrow, Text Input, Down Arrow, Hint)
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
        this._minUpBtn.connect('clicked', () => this._adjustMinutes(1));

        this._minEntry = new St.Entry({
            text: '25',
            style_class: 'focus-timer-clock-entry',
            can_focus: true,
        });
        this._minEntry.clutter_text.set_max_length(4);
        this._minEntry.clutter_text.connect('activate', () => this._applyEnteredTime());
        this._minEntry.connect('key-focus-out', () => this._applyEnteredTime());

        this._minDownBtn = new St.Button({
            child: new St.Icon({
                icon_name: 'go-down-symbolic',
                style_class: 'focus-timer-stepper-icon',
            }),
            style_class: 'focus-timer-stepper-btn',
            can_focus: true,
        });
        this._minDownBtn.connect('clicked', () => this._adjustMinutes(-1));

        const minHintLabel = new St.Label({
            text: _('MIN'),
            style_class: 'focus-timer-time-label-hint',
            x_align: Clutter.ActorAlign.CENTER,
        });

        minCol.add_child(this._minUpBtn);
        minCol.add_child(this._minEntry);
        minCol.add_child(this._minDownBtn);
        minCol.add_child(minHintLabel);

        // Scroll over minutes column to adjust
        minCol.connect('scroll-event', (actor, event) => {
            if (this._timerState === 'running')
                return Clutter.EVENT_PROPAGATE;
            const dir = event.get_scroll_direction();
            if (dir === Clutter.ScrollDirection.UP) {
                this._adjustMinutes(1);
                return Clutter.EVENT_STOP;
            } else if (dir === Clutter.ScrollDirection.DOWN) {
                this._adjustMinutes(-1);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // Colon separator
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

        // Seconds Column (Up Arrow, Text Input, Down Arrow, Hint)
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
        this._secUpBtn.connect('clicked', () => this._adjustSeconds(5));

        this._secEntry = new St.Entry({
            text: '00',
            style_class: 'focus-timer-clock-entry',
            can_focus: true,
        });
        this._secEntry.clutter_text.set_max_length(2);
        this._secEntry.clutter_text.connect('activate', () => this._applyEnteredTime());
        this._secEntry.connect('key-focus-out', () => this._applyEnteredTime());

        this._secDownBtn = new St.Button({
            child: new St.Icon({
                icon_name: 'go-down-symbolic',
                style_class: 'focus-timer-stepper-icon',
            }),
            style_class: 'focus-timer-stepper-btn',
            can_focus: true,
        });
        this._secDownBtn.connect('clicked', () => this._adjustSeconds(-5));

        const secHintLabel = new St.Label({
            text: _('SEC'),
            style_class: 'focus-timer-time-label-hint',
            x_align: Clutter.ActorAlign.CENTER,
        });

        secCol.add_child(this._secUpBtn);
        secCol.add_child(this._secEntry);
        secCol.add_child(this._secDownBtn);
        secCol.add_child(secHintLabel);

        // Scroll over seconds column to adjust
        secCol.connect('scroll-event', (actor, event) => {
            if (this._timerState === 'running')
                return Clutter.EVENT_PROPAGATE;
            const dir = event.get_scroll_direction();
            if (dir === Clutter.ScrollDirection.UP) {
                this._adjustSeconds(5);
                return Clutter.EVENT_STOP;
            } else if (dir === Clutter.ScrollDirection.DOWN) {
                this._adjustSeconds(-5);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this._clockRow.add_child(minCol);
        this._clockRow.add_child(colonBox);
        this._clockRow.add_child(secCol);
        clockBox.add_child(this._clockRow);

        // Stopwatch Display Label (Shown only when in Stopwatch mode)
        this._stopwatchClockLabel = new St.Label({
            text: '00:00',
            style_class: 'focus-timer-clock-label',
            x_align: Clutter.ActorAlign.CENTER,
            visible: false,
        });
        clockBox.add_child(this._stopwatchClockLabel);

        // Subtitle status label
        this._statusLabel = new St.Label({
            text: _('Type or scroll numbers to set timer'),
            style_class: 'focus-timer-status-label',
            x_align: Clutter.ActorAlign.CENTER,
        });
        clockBox.add_child(this._statusLabel);
        mainContainer.add_child(clockBox);

        // 3. Primary Controls (Start / Pause / Reset)
        const controlsRow = new St.BoxLayout({
            style_class: 'focus-timer-controls-row',
            x_align: Clutter.ActorAlign.CENTER,
        });

        this._startPauseBtn = new St.Button({
            label: _('Start'),
            style_class: 'focus-timer-btn-primary',
            can_focus: true,
        });
        this._startPauseBtn.connect('clicked', () => this._togglePlayPause());

        this._resetBtn = new St.Button({
            label: _('Reset'),
            style_class: 'focus-timer-btn-secondary',
            can_focus: true,
        });
        this._resetBtn.connect('clicked', () => this._resetCurrent());

        controlsRow.add_child(this._startPauseBtn);
        controlsRow.add_child(this._resetBtn);
        mainContainer.add_child(controlsRow);

        // 4. Stopwatch Specific Section (Lap button + Lap list)
        this._stopwatchSection = new St.BoxLayout({
            vertical: true,
            style_class: 'focus-timer-section',
            x_expand: true,
            visible: false,
        });

        const lapBtnRow = new St.BoxLayout({
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'focus-timer-lap-btn-row',
        });

        this._lapBtn = new St.Button({
            label: _('Lap Time'),
            style_class: 'focus-timer-btn-secondary',
            can_focus: true,
        });
        this._lapBtn.connect('clicked', () => this._recordLap());
        lapBtnRow.add_child(this._lapBtn);
        this._stopwatchSection.add_child(lapBtnRow);

        this._lapsListBox = new St.BoxLayout({
            vertical: true,
            style_class: 'focus-timer-laps-box',
            x_expand: true,
            visible: false,
        });
        this._stopwatchSection.add_child(this._lapsListBox);
        mainContainer.add_child(this._stopwatchSection);

        // 5. Footer Row (Sound Toggle & Settings Gear)
        const footerRow = new St.BoxLayout({
            style_class: 'focus-timer-footer-row',
            x_expand: true,
        });

        this._soundToggleBtn = new St.Button({
            style_class: 'focus-timer-icon-btn',
            can_focus: true,
        });
        this._soundIcon = new St.Icon({
            icon_name: this._settings.get_boolean('sound-enabled') ? 'audio-volume-high-symbolic' : 'audio-volume-muted-symbolic',
            style_class: 'popup-menu-icon',
        });
        this._soundToggleBtn.set_child(this._soundIcon);
        this._soundToggleBtn.connect('clicked', () => {
            const current = this._settings.get_boolean('sound-enabled');
            this._settings.set_boolean('sound-enabled', !current);
            this._soundIcon.icon_name = !current ? 'audio-volume-high-symbolic' : 'audio-volume-muted-symbolic';
        });

        const spacer = new St.Widget({x_expand: true});

        const prefsBtn = new St.Button({
            style_class: 'focus-timer-icon-btn',
            can_focus: true,
        });
        const prefsIcon = new St.Icon({
            icon_name: 'emblem-system-symbolic',
            style_class: 'popup-menu-icon',
        });
        prefsBtn.set_child(prefsIcon);
        prefsBtn.connect('clicked', () => {
            this.menu.close();
            this._extension.openPreferences();
        });

        footerRow.add_child(this._soundToggleBtn);
        footerRow.add_child(spacer);
        footerRow.add_child(prefsBtn);
        mainContainer.add_child(footerRow);

        menuItem.add_child(mainContainer);
        this.menu.addMenuItem(menuItem);
    }

    _switchMode(mode) {
        if (this._mode === mode)
            return;

        this._mode = mode;
        const isTimer = mode === 'timer';

        this._clockRow.visible = isTimer;
        this._stopwatchClockLabel.visible = !isTimer;
        this._stopwatchSection.visible = !isTimer;

        if (isTimer) {
            this._timerTabBtn.style_class = 'focus-timer-tab focus-timer-tab-active';
            this._stopwatchTabBtn.style_class = 'focus-timer-tab';
        } else {
            this._timerTabBtn.style_class = 'focus-timer-tab';
            this._stopwatchTabBtn.style_class = 'focus-timer-tab focus-timer-tab-active';
        }

        this._updateDisplay();
    }

    _applyEnteredTime() {
        if (this._timerState === 'running')
            return;

        let m = parseInt(this._minEntry.get_text(), 10);
        let s = parseInt(this._secEntry.get_text(), 10);

        if (isNaN(m) || m < 0) m = 0;
        if (isNaN(s) || s < 0) s = 0;

        let total = m * 60 + s;
        if (total <= 0) total = 60; // minimum 1 minute

        this._timerRemaining = total;
        this._timerTotal = total;
        this._timerState = 'stopped';

        this._updateDisplay();
    }

    _adjustMinutes(delta) {
        if (this._timerState === 'running')
            return;

        const currentSecs = this._timerRemaining % 60;
        let currentMins = Math.floor(this._timerRemaining / 60) + delta;
        if (currentMins < 0) currentMins = 0;
        if (currentMins === 0 && currentSecs === 0) currentMins = 1;

        const total = currentMins * 60 + currentSecs;
        this._timerRemaining = total;
        this._timerTotal = total;
        this._timerState = 'stopped';

        this._updateDisplay();
    }

    _adjustSeconds(delta) {
        if (this._timerState === 'running')
            return;

        let total = this._timerRemaining + delta;
        if (total < 10) total = 10;

        this._timerRemaining = total;
        this._timerTotal = total;
        this._timerState = 'stopped';

        this._updateDisplay();
    }

    _togglePlayPause() {
        if (this._mode === 'timer') {
            if (this._timerState === 'running') {
                this._pauseTimer();
            } else {
                this._startTimer();
            }
        } else {
            if (this._stopwatchState === 'running') {
                this._pauseStopwatch();
            } else {
                this._startStopwatch();
            }
        }
    }

    _startTimer() {
        this._applyEnteredTime();

        if (this._timerRemaining <= 0) {
            this._timerRemaining = this._timerTotal > 0 ? this._timerTotal : 25 * 60;
        }

        this._timerState = 'running';
        this._startInterval();
        this._updateDisplay();
    }

    _pauseTimer() {
        this._timerState = 'paused';
        this._pauseInterval();
        this._updateDisplay();
    }

    _startStopwatch() {
        this._stopwatchState = 'running';
        this._startInterval();
        this._updateDisplay();
    }

    _pauseStopwatch() {
        this._stopwatchState = 'paused';
        this._pauseInterval();
        this._updateDisplay();
    }

    _resetCurrent() {
        this._pauseInterval();

        if (this._mode === 'timer') {
            this._timerState = 'stopped';
            this._timerRemaining = this._timerTotal > 0 ? this._timerTotal : this._settings.get_int('pomodoro-duration') * 60;
        } else {
            this._stopwatchState = 'stopped';
            this._stopwatchSeconds = 0;
            this._stopwatchLaps = [];
            this._refreshLapsList();
        }

        this._updateDisplay();
    }

    _recordLap() {
        if (this._mode !== 'stopwatch' || this._stopwatchSeconds === 0)
            return;

        const lapTimeStr = this._formatTime(this._stopwatchSeconds);
        this._stopwatchLaps.unshift(lapTimeStr);
        if (this._stopwatchLaps.length > 5)
            this._stopwatchLaps.pop();

        this._refreshLapsList();
    }

    _refreshLapsList() {
        this._lapsListBox.destroy_all_children();

        if (this._stopwatchLaps.length === 0) {
            this._lapsListBox.visible = false;
            return;
        }

        this._lapsListBox.visible = true;
        this._stopwatchLaps.forEach((time, index) => {
            const row = new St.BoxLayout({
                style_class: 'focus-timer-lap-row',
                x_expand: true,
            });
            const numLabel = new St.Label({
                text: `#${this._stopwatchLaps.length - index}  `,
                style_class: 'focus-timer-lap-number',
            });
            const timeLabel = new St.Label({
                text: time,
                x_expand: true,
            });
            row.add_child(numLabel);
            row.add_child(timeLabel);
            this._lapsListBox.add_child(row);
        });
    }

    _startInterval() {
        if (this._intervalId)
            return;

        this._intervalId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            this._tick();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _pauseInterval() {
        if (this._intervalId) {
            GLib.Source.remove(this._intervalId);
            this._intervalId = null;
        }
    }

    _tick() {
        if (this._mode === 'timer') {
            if (this._timerState === 'running') {
                if (this._timerRemaining > 0) {
                    this._timerRemaining -= 1;
                    this._updateDisplay();
                }

                if (this._timerRemaining <= 0) {
                    this._onTimerFinished();
                }
            }
        } else {
            if (this._stopwatchState === 'running') {
                this._stopwatchSeconds += 1;
                this._updateDisplay();
            }
        }
    }

    _onTimerFinished() {
        this._pauseInterval();
        this._timerState = 'finished';

        this._playAlertSound();

        const title = _('Focus Session Finished!');
        const message = _('Great job staying focused! Time to take a restful break.');

        this._sendNotification(title, message);
        this._updateDisplay();
    }

    _playAlertSound() {
        if (!this._settings.get_boolean('sound-enabled'))
            return;

        try {
            GLib.spawn_command_line_async('canberra-gtk-play -i alarm-clock-elapsed -d "Focus Timer"');
        } catch {
            try {
                GLib.spawn_command_line_async('pw-play /usr/share/sounds/freedesktop/stereo/alarm-clock-elapsed.oga');
            } catch (e) {
                console.warn('Focus Timer: Could not play audio alert:', e);
            }
        }
    }

    _sendNotification(title, message) {
        if (!this._settings.get_boolean('notification-enabled'))
            return;

        Main.notify(title, message);
    }

    _updateDisplay() {
        this._updatePanelLabel();
        this._updateMenuDisplay();
    }

    _updatePanelLabel() {
        const showSeconds = this._settings.get_boolean('show-seconds-panel');

        if (this._mode === 'timer') {
            if (this._timerState === 'running') {
                this._panelIcon.icon_name = 'alarm-symbolic';
                this._panelLabel.text = this._formatTime(this._timerRemaining, showSeconds);
                this._panelLabel.style_class = 'focus-timer-panel-label focus-timer-panel-running';
            } else if (this._timerState === 'paused') {
                this._panelIcon.icon_name = 'media-playback-pause-symbolic';
                this._panelLabel.text = this._formatTime(this._timerRemaining, showSeconds);
                this._panelLabel.style_class = 'focus-timer-panel-label';
            } else if (this._timerState === 'finished') {
                this._panelIcon.icon_name = 'emblem-default-symbolic';
                this._panelLabel.text = _('Done!');
                this._panelLabel.style_class = 'focus-timer-panel-label focus-timer-panel-done';
            } else {
                this._panelIcon.icon_name = 'preferences-system-time-symbolic';
                this._panelLabel.text = this._formatTime(this._timerRemaining, false);
                this._panelLabel.style_class = 'focus-timer-panel-label';
            }
        } else {
            // Stopwatch mode
            if (this._stopwatchState === 'running') {
                this._panelIcon.icon_name = 'media-playback-start-symbolic';
                this._panelLabel.text = this._formatTime(this._stopwatchSeconds, true);
                this._panelLabel.style_class = 'focus-timer-panel-label focus-timer-panel-running';
            } else if (this._stopwatchState === 'paused') {
                this._panelIcon.icon_name = 'media-playback-pause-symbolic';
                this._panelLabel.text = this._formatTime(this._stopwatchSeconds, true);
                this._panelLabel.style_class = 'focus-timer-panel-label';
            } else {
                this._panelIcon.icon_name = 'preferences-system-time-symbolic';
                this._panelLabel.text = '00:00';
                this._panelLabel.style_class = 'focus-timer-panel-label';
            }
        }
    }

    _updateMenuDisplay() {
        if (this._mode === 'timer') {
            const m = Math.floor(this._timerRemaining / 60);
            const s = this._timerRemaining % 60;
            const mStr = m.toString().padStart(2, '0');
            const sStr = s.toString().padStart(2, '0');

            if (this._timerState === 'running') {
                this._minUpBtn.visible = false;
                this._minDownBtn.visible = false;
                this._secUpBtn.visible = false;
                this._secDownBtn.visible = false;
                this._minEntry.clutter_text.set_editable(false);
                this._secEntry.clutter_text.set_editable(false);

                this._minEntry.set_text(mStr);
                this._secEntry.set_text(sStr);

                this._startPauseBtn.label = _('Pause');
                this._startPauseBtn.style_class = 'focus-timer-btn-primary focus-timer-btn-pause';
                this._statusLabel.text = _('Focus Session in Progress');
            } else if (this._timerState === 'paused') {
                this._minUpBtn.visible = true;
                this._minDownBtn.visible = true;
                this._secUpBtn.visible = true;
                this._secDownBtn.visible = true;
                this._minEntry.clutter_text.set_editable(true);
                this._secEntry.clutter_text.set_editable(true);

                this._minEntry.set_text(mStr);
                this._secEntry.set_text(sStr);

                this._startPauseBtn.label = _('Resume');
                this._startPauseBtn.style_class = 'focus-timer-btn-primary';
                this._statusLabel.text = _('Session Paused');
            } else if (this._timerState === 'finished') {
                this._minUpBtn.visible = true;
                this._minDownBtn.visible = true;
                this._secUpBtn.visible = true;
                this._secDownBtn.visible = true;
                this._minEntry.clutter_text.set_editable(true);
                this._secEntry.clutter_text.set_editable(true);

                this._minEntry.set_text(mStr);
                this._secEntry.set_text(sStr);

                this._startPauseBtn.label = _('Restart');
                this._startPauseBtn.style_class = 'focus-timer-btn-primary';
                this._statusLabel.text = _('Completed! Great job!');
            } else {
                // Stopped / Idle
                this._minUpBtn.visible = true;
                this._minDownBtn.visible = true;
                this._secUpBtn.visible = true;
                this._secDownBtn.visible = true;
                this._minEntry.clutter_text.set_editable(true);
                this._secEntry.clutter_text.set_editable(true);

                const hasFocus = this._minEntry.has_key_focus() || this._secEntry.has_key_focus();
                if (!hasFocus) {
                    this._minEntry.set_text(mStr);
                    this._secEntry.set_text(sStr);
                }

                this._startPauseBtn.label = _('Start');
                this._startPauseBtn.style_class = 'focus-timer-btn-primary';
                this._statusLabel.text = _('Type numbers or scroll to set timer');
            }
        } else {
            // Stopwatch mode
            this._stopwatchClockLabel.text = this._formatTime(this._stopwatchSeconds, true);

            if (this._stopwatchState === 'running') {
                this._startPauseBtn.label = _('Pause');
                this._startPauseBtn.style_class = 'focus-timer-btn-primary focus-timer-btn-pause';
                this._statusLabel.text = _('Stopwatch Running');
            } else if (this._stopwatchState === 'paused') {
                this._startPauseBtn.label = _('Resume');
                this._startPauseBtn.style_class = 'focus-timer-btn-primary';
                this._statusLabel.text = _('Stopwatch Paused');
            } else {
                this._startPauseBtn.label = _('Start');
                this._startPauseBtn.style_class = 'focus-timer-btn-primary';
                this._statusLabel.text = _('Stopwatch Ready');
            }
        }
    }

    _formatTime(totalSeconds, includeSeconds = true) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = n => n.toString().padStart(2, '0');

        if (hours > 0) {
            return includeSeconds
                ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
                : `${pad(hours)}:${pad(minutes)}`;
        }

        return includeSeconds
            ? `${pad(minutes)}:${pad(seconds)}`
            : `${pad(minutes)}m`;
    }

    destroy() {
        this._pauseInterval();

        if (this._settings) {
            this._settings.disconnectObject(this);
            this._settings = null;
        }

        super.destroy();
    }
});

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
