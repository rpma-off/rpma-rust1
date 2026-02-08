const Database = require('better-sqlite3');
const path = require('path');

// Database path - adjust as needed
const dbPath = path.join(__dirname, '..', 'src-tauri', 'rpma.db');

console.log('=== User Settings Verification and Fix ===\n');

try {
    const db = new Database(dbPath, { verbose: console.log });
    
    const userId = 'a2975c76-eeda-41f8-9efe-d0741c9785a5';
    
    // 1. Check if user exists
    console.log('1. Checking if user exists...');
    const user = db.prepare(`
        SELECT id, email, username, full_name, is_active, deleted_at
        FROM users
        WHERE id = ?
    `).get(userId);
    
    if (!user) {
        console.log(`❌ User ${userId} not found in users table`);
        process.exit(1);
    }
    
    console.log(`✓ User found: ${user.email || user.username} (${user.id})`);
    console.log(`  - Active: ${user.is_active ? 'Yes' : 'No'}`);
    console.log(`  - Deleted: ${user.deleted_at ? 'Yes' : 'No'}`);
    
    // 2. Check if user_settings exists
    console.log('\n2. Checking if user_settings record exists...');
    const settings = db.prepare(`
        SELECT id, user_id, created_at, updated_at
        FROM user_settings
        WHERE user_id = ?
    `).get(userId);
    
    if (settings) {
        console.log(`✓ User settings found (ID: ${settings.id})`);
        console.log(`  - Created: ${new Date(settings.created_at).toISOString()}`);
        console.log(`  - Updated: ${new Date(settings.updated_at).toISOString()}`);
    } else {
        console.log(`❌ No user_settings record found for user ${userId}`);
        
        // 3. Create missing user_settings record with default values
        console.log('\n3. Creating missing user_settings record...');
        const settingsId = require('uuid').v4();
        const now = Date.now();
        
        const insertResult = db.prepare(`
            INSERT INTO user_settings (
                id, user_id, full_name, email, phone, avatar_url, notes,
                email_notifications, push_notifications, task_assignments, task_updates,
                system_alerts, weekly_reports, theme, language, date_format, time_format,
                high_contrast, large_text, reduce_motion, screen_reader, auto_refresh, refresh_interval,
                two_factor_enabled, session_timeout,
                cache_enabled, cache_size, offline_mode, sync_on_startup, background_sync,
                image_compression, preload_data,
                accessibility_high_contrast, accessibility_large_text, accessibility_reduce_motion,
                accessibility_screen_reader, accessibility_focus_indicators, accessibility_keyboard_navigation,
                accessibility_text_to_speech, accessibility_speech_rate, accessibility_font_size,
                accessibility_color_blind_mode,
                notifications_email_enabled, notifications_push_enabled, notifications_in_app_enabled,
                notifications_task_assigned, notifications_task_updated, notifications_task_completed,
                notifications_task_overdue, notifications_system_alerts, notifications_maintenance,
                notifications_security_alerts, notifications_quiet_hours_enabled,
                notifications_quiet_hours_start, notifications_quiet_hours_end,
                notifications_digest_frequency, notifications_batch_notifications,
                notifications_sound_enabled, notifications_sound_volume,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            settingsId, userId, 
            user.full_name || '', user.email || '', null, null, null,
            1, 1, 1, 1, 1, 0, 'system', 'fr', 'DD/MM/YYYY', '24h',
            0, 0, 0, 0, 1, 60,
            0, 480,
            1, 100, 0, 1, 1,
            1, 0,
            0, 0, 0, 0, 1, 1,
            0, 1.0, 16, 'none',
            1, 1, 1,
            1, 1, 0,
            1, 1, 0,
            1, 0, 1,
            0, '22:00', '08:00',
            'never', 0,
            1, 70,
            now, now
        );
        
        if (insertResult.changes > 0) {
            console.log(`✓ Created user_settings record (ID: ${settingsId})`);
        } else {
            console.log('❌ Failed to create user_settings record');
        }
    }
    
    // 4. Check for other users without settings
    console.log('\n4. Checking for other users without settings...');
    const usersWithoutSettings = db.prepare(`
        SELECT u.id, u.email, u.username
        FROM users u
        LEFT JOIN user_settings us ON u.id = us.user_id
        WHERE us.user_id IS NULL
          AND u.deleted_at IS NULL
    `).all();
    
    if (usersWithoutSettings.length > 0) {
        console.log(`Found ${usersWithoutSettings.length} other users without settings:`);
        usersWithoutSettings.forEach(u => {
            console.log(`  - ${u.email || u.username} (${u.id})`);
        });
        
        // Ask if we should fix all users
        console.log('\nWould you like to create settings for all these users? (Run with --fix-all flag)');
    } else {
        console.log('✓ All active users have settings records');
    }
    
    console.log('\n=== Verification Complete ===');
    db.close();
    
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}