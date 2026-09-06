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
            title: _('General'),
            icon_name: 'preferences-system-time-symbolic',
        });
        window.add(page);

        // Group 1: Default Duration
        const timerGroup = new Adw.PreferencesGroup({
            title: _('Timer Settings'),
            description: _('Configure default timer duration'),
        });
        page.add(timerGroup);

        const pomoRow = new Adw.SpinRow({
            title: _('Default Focus Duration (Minutes)'),
            subtitle: _('Initial timer duration on startup or reset'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 180,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('pomodoro-duration'),
            }),
        });
        settings.bind('pomodoro-duration', pomoRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        timerGroup.add(pomoRow);

        // Group 2: Notifications & Sound
        const alertsGroup = new Adw.PreferencesGroup({
            title: _('Alerts & Sound'),
            description: _('Notifications when timer runs out'),
        });
        page.add(alertsGroup);

        const soundRow = new Adw.SwitchRow({
            title: _('Sound Alert'),
            subtitle: _('Play audio chime when session finishes'),
        });
        settings.bind('sound-enabled', soundRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        alertsGroup.add(soundRow);

        const notifRow = new Adw.SwitchRow({
            title: _('Desktop Notification'),
            subtitle: _('Show a banner alert when session finishes'),
        });
        settings.bind('notification-enabled', notifRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        alertsGroup.add(notifRow);

        // Group 3: Top Bar Appearance
        const appearanceGroup = new Adw.PreferencesGroup({
            title: _('Top Bar Appearance'),
            description: _('Display settings for the panel counter'),
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
