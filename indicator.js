// Focus Timer & Stopwatch - Panel Indicator & Dropdown Menu Component

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {ClockWidget} from './clockWidget.js';
import * as Utils from './utils.js';

export const FocusTimerIndicator = GObject.registerClass(
class FocusTimerIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.5, _('Focus Timer'));

        this._extension = extension;
        this._settings = extension.getSettings();

        // Mode & Timer states
        this._mode = 'timer'; // 'timer' | 'stopwatch'
        this._timerState = 'stopped'; // 'stopped' | 'running' | 'paused' | 'finished'
        this._timerRemaining = this._settings.get_int('pomodoro-duration') * 60;
        this._timerTotal = this._timerRemaining;

        // Stopwatch state
        this._stopwatchState = 'stopped'; // 'stopped' | 'running' | 'paused'
        this._stopwatchSeconds = 0;
        this._stopwatchLaps = [];

        // Interval handle
        this._intervalId = null;

        // Build UI
        this._buildPanelButton();
        this._buildMenu();

        // Middle-click shortcut on top bar to toggle play/pause
        this.connect('button-press-event', (actor, event) => {
            if (event.get_button() === 2) {
                this._togglePlayPause();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // Scroll shortcut on top bar to adjust minutes
        this.connect('scroll-event', (actor, event) => {
            if (this._mode !== 'timer' || this._timerState === 'running')
                return Clutter.EVENT_PROPAGATE;

            const direction = event.get_scroll_direction();
            const delta = direction === Clutter.ScrollDirection.UP ? 60 : -60;
            const updated = Math.max(60, this._timerRemaining + delta);
            this._timerRemaining = updated;
            this._timerTotal = updated;
            this._clockWidget.setDisplay(updated, false);
            this._updatePanelLabel();
            return Clutter.EVENT_STOP;
        });

        // Settings synchronization
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

        const mainBox = new St.BoxLayout({
            vertical: true,
            style_class: 'focus-timer-menu-box',
            x_expand: true,
        });

        // 1. Mode Switcher (Timer / Stopwatch)
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
        mainBox.add_child(switcherBox);

        // 2. Clock Area
        const clockArea = new St.BoxLayout({
            vertical: true,
            style_class: 'focus-timer-clock-box',
            x_align: Clutter.ActorAlign.CENTER,
        });

        // Interactive Clock Component
        this._clockWidget = new ClockWidget(newTime => {
            this._timerRemaining = newTime;
            this._timerTotal = newTime;
            this._timerState = 'stopped';
            this._updatePanelLabel();
        });
        clockArea.add_child(this._clockWidget);

        // Stopwatch Readout Label
        this._stopwatchLabel = new St.Label({
            text: '00:00',
            style_class: 'focus-timer-clock-label',
            x_align: Clutter.ActorAlign.CENTER,
            visible: false,
        });
        clockArea.add_child(this._stopwatchLabel);

        // Subtitle status label
        this._statusLabel = new St.Label({
            text: _('Type numbers or scroll to set timer'),
            style_class: 'focus-timer-status-label',
            x_align: Clutter.ActorAlign.CENTER,
        });
        clockArea.add_child(this._statusLabel);
        mainBox.add_child(clockArea);

        // 3. Action Controls Row (Start / Pause / Reset)
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
        mainBox.add_child(controlsRow);

        // 4. Stopwatch Laps Section
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
        mainBox.add_child(this._stopwatchSection);

        // 5. Footer Row (Sound Toggle & Settings Gear)
        const footerRow = new St.BoxLayout({
            style_class: 'focus-timer-footer-row',
            x_expand: true,
        });

        this._soundBtn = new St.Button({
            style_class: 'focus-timer-icon-btn',
            can_focus: true,
        });
        this._soundIcon = new St.Icon({
            icon_name: this._settings.get_boolean('sound-enabled') ? 'audio-volume-high-symbolic' : 'audio-volume-muted-symbolic',
            style_class: 'popup-menu-icon',
        });
        this._soundBtn.set_child(this._soundIcon);
        this._soundBtn.connect('clicked', () => {
            const current = this._settings.get_boolean('sound-enabled');
            this._settings.set_boolean('sound-enabled', !current);
            this._soundIcon.icon_name = !current ? 'audio-volume-high-symbolic' : 'audio-volume-muted-symbolic';
        });

        const spacer = new St.Widget({x_expand: true});

        const prefsBtn = new St.Button({
            style_class: 'focus-timer-icon-btn',
            can_focus: true,
        });
        prefsBtn.set_child(new St.Icon({
            icon_name: 'emblem-system-symbolic',
            style_class: 'popup-menu-icon',
        }));
        prefsBtn.connect('clicked', () => {
            this.menu.close();
            this._extension.openPreferences();
        });

        footerRow.add_child(this._soundBtn);
        footerRow.add_child(spacer);
        footerRow.add_child(prefsBtn);
        mainBox.add_child(footerRow);

        menuItem.add_child(mainBox);
        this.menu.addMenuItem(menuItem);
    }

    _switchMode(mode) {
        if (this._mode === mode)
            return;

        this._mode = mode;
        const isTimer = mode === 'timer';

        this._clockWidget.visible = isTimer;
        this._stopwatchLabel.visible = !isTimer;
        this._stopwatchSection.visible = !isTimer;

        this._timerTabBtn.style_class = isTimer
            ? 'focus-timer-tab focus-timer-tab-active'
            : 'focus-timer-tab';
        this._stopwatchTabBtn.style_class = isTimer
            ? 'focus-timer-tab'
            : 'focus-timer-tab focus-timer-tab-active';

        this._updateDisplay();
    }

    _togglePlayPause() {
        if (this._mode === 'timer') {
            if (this._timerState === 'running') {
                this._timerState = 'paused';
                this._pauseInterval();
            } else {
                this._timerRemaining = this._clockWidget.getEnteredSeconds();
                this._timerTotal = this._timerRemaining;
                this._timerState = 'running';
                this._startInterval();
            }
        } else {
            if (this._stopwatchState === 'running') {
                this._stopwatchState = 'paused';
                this._pauseInterval();
            } else {
                this._stopwatchState = 'running';
                this._startInterval();
            }
        }
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

        this._stopwatchLaps.unshift(Utils.formatTime(this._stopwatchSeconds, true));
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
            row.add_child(new St.Label({
                text: `#${this._stopwatchLaps.length - index}  `,
                style_class: 'focus-timer-lap-number',
            }));
            row.add_child(new St.Label({
                text: time,
                x_expand: true,
            }));
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

        Utils.playAlertSound(this._settings);
        Utils.sendNotification(
            _('Focus Session Finished!'),
            _('Great job staying focused! Time to take a restful break.'),
            this._settings
        );

        this._updateDisplay();
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
                this._panelLabel.text = Utils.formatTime(this._timerRemaining, showSeconds);
                this._panelLabel.style_class = 'focus-timer-panel-label focus-timer-panel-running';
            } else if (this._timerState === 'paused') {
                this._panelIcon.icon_name = 'media-playback-pause-symbolic';
                this._panelLabel.text = Utils.formatTime(this._timerRemaining, showSeconds);
                this._panelLabel.style_class = 'focus-timer-panel-label';
            } else if (this._timerState === 'finished') {
                this._panelIcon.icon_name = 'emblem-default-symbolic';
                this._panelLabel.text = _('Done!');
                this._panelLabel.style_class = 'focus-timer-panel-label focus-timer-panel-done';
            } else {
                this._panelIcon.icon_name = 'preferences-system-time-symbolic';
                this._panelLabel.text = Utils.formatTime(this._timerRemaining, false);
                this._panelLabel.style_class = 'focus-timer-panel-label';
            }
        } else {
            if (this._stopwatchState === 'running') {
                this._panelIcon.icon_name = 'media-playback-start-symbolic';
                this._panelLabel.text = Utils.formatTime(this._stopwatchSeconds, true);
                this._panelLabel.style_class = 'focus-timer-panel-label focus-timer-panel-running';
            } else if (this._stopwatchState === 'paused') {
                this._panelIcon.icon_name = 'media-playback-pause-symbolic';
                this._panelLabel.text = Utils.formatTime(this._stopwatchSeconds, true);
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
            const isRunning = this._timerState === 'running';
            this._clockWidget.setDisplay(this._timerRemaining, isRunning);

            if (isRunning) {
                this._startPauseBtn.label = _('Pause');
                this._startPauseBtn.style_class = 'focus-timer-btn-primary focus-timer-btn-pause';
                this._statusLabel.text = _('Focus Session in Progress');
            } else if (this._timerState === 'paused') {
                this._startPauseBtn.label = _('Resume');
                this._startPauseBtn.style_class = 'focus-timer-btn-primary';
                this._statusLabel.text = _('Session Paused');
            } else if (this._timerState === 'finished') {
                this._startPauseBtn.label = _('Restart');
                this._startPauseBtn.style_class = 'focus-timer-btn-primary';
                this._statusLabel.text = _('Completed! Great job!');
            } else {
                this._startPauseBtn.label = _('Start');
                this._startPauseBtn.style_class = 'focus-timer-btn-primary';
                this._statusLabel.text = _('Type numbers or scroll to set timer');
            }
        } else {
            this._stopwatchLabel.text = Utils.formatTime(this._stopwatchSeconds, true);

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

    destroy() {
        this._pauseInterval();

        if (this._settings) {
            this._settings.disconnectObject(this);
            this._settings = null;
        }

        super.destroy();
    }
});
