// Focus Timer & Stopwatch - Utility Functions

import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

/**
 * Format total seconds into a clean time string (HH:MM:SS or MM:SS)
 */
export function formatTime(totalSeconds, includeSeconds = true) {
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

/**
 * Play an audio chime alert when timer finishes
 */
export function playAlertSound(settings) {
    if (!settings.get_boolean('sound-enabled'))
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

/**
 * Send a native GNOME desktop notification banner
 */
export function sendNotification(title, message, settings) {
    if (!settings.get_boolean('notification-enabled'))
        return;

    Main.notify(title, message);
}
