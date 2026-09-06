// Focus Timer & Stopwatch - Extension Preferences
// Compatible with GNOME 45, 46, 47, 48, 49, 50

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class FocusTimerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('Focus Timer Settings'),
            icon_name: 'preferences-system-time-symbolic',
        });
        window.add(page);

        // Group 1: Timer Presets
        const presetsGroup = new Adw.PreferencesGroup({
            title: _('Study & Break Durations'),
            description: _('Configure default times (in minutes) for focused work and rest intervals'),
        });
        page.add(presetsGroup);

        // Pomodoro Duration SpinRow
        const pomoRow = new Adw.SpinRow({
            title: _('Focus Session (Pomodoro)'),
            subtitle: _('Default study duration in minutes'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 180,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('pomodoro-duration'),
            }),
        });
        settings.bind('pomodoro-duration', pomoRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        presetsGroup.add(pomoRow);

        // Short Break Duration SpinRow
        const shortBreakRow = new Adw.SpinRow({
            title: _('Short Break'),
            subtitle: _('Rest duration after a focus session in minutes'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 60,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('short-break-duration'),
            }),
        });
        settings.bind('short-break-duration', shortBreakRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        presetsGroup.add(shortBreakRow);

        // Long Break Duration SpinRow
        const longBreakRow = new Adw.SpinRow({
            title: _('Long Break'),
            subtitle: _('Extended rest duration in minutes'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 120,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('long-break-duration'),
            }),
        });
        settings.bind('long-break-duration', longBreakRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        presetsGroup.add(longBreakRow);

        // Group 2: Notifications & Sound
        const alertsGroup = new Adw.PreferencesGroup({
            title: _('Alerts & Sound'),
            description: _('How you are notified when a timer ends'),
        });
        page.add(alertsGroup);

        const soundRow = new Adw.SwitchRow({
            title: _('Sound Chime'),
            subtitle: _('Play an audio alert when timer runs out'),
        });
        settings.bind('sound-enabled', soundRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        alertsGroup.add(soundRow);

        const notifRow = new Adw.SwitchRow({
            title: _('Desktop Notification'),
            subtitle: _('Show a desktop banner alert when timer runs out'),
        });
        settings.bind('notification-enabled', notifRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        alertsGroup.add(notifRow);

        // Group 3: Top Bar Appearance
        const appearanceGroup = new Adw.PreferencesGroup({
            title: _('Top Bar Appearance'),
            description: _('Visual settings for the panel indicator'),
        });
        page.add(appearanceGroup);

        const secondsRow = new Adw.SwitchRow({
            title: _('Show Seconds in Panel'),
            subtitle: _('Display MM:SS countdown directly on the top bar'),
        });
        settings.bind('show-seconds-panel', secondsRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        appearanceGroup.add(secondsRow);
    }
}
