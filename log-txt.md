﻿   |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
   |
help: try using a conversion method
   |
37 |             expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp().to_string(),
   |                                                                                      ++++++++++++

error[E0308]: mismatched types
  --> src-tauri\src\tests\integration\session_repository_test.rs:40:25
   |
40 |             created_at: chrono::Utc::now().timestamp(),
   |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
   |
help: try using a conversion method
   |
40 |             created_at: chrono::Utc::now().timestamp().to_string(),
   |                                                       ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
  --> src-tauri\src\tests\integration\session_repository_test.rs:41:13
   |
41 |             updated_at: chrono::Utc::now().timestamp(),
   |             ^^^^^^^^^^ `models::auth::UserSession` does not have this field
   |
   = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
  --> src-tauri\src\tests\integration\session_repository_test.rs:45:27
   |
45 |         let result = repo.create(&session);
   |                           ^^^^^^ method not found in `session_repository::SessionRepository`
   |
  ::: src-tauri\src\repositories\session_repository.rs:13:1
   |
13 | pub struct SessionRepository {
   | ---------------------------- method `create` not found for this struct
   |
   = help: items from traits can only be used if the trait is implemented and in scope
   = note: the following trait defines an item `create`, perhaps you need to implement it:
           candidate #1: `regex_syntax::hir::interval::Interval`

error[E0308]: mismatched types
  --> src-tauri\src\tests\integration\session_repository_test.rs:64:25
   |
64 |             expires_at: (chrono::Utc::now() + chrono::Duration::hours(2)).timestamp(),
   |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
   |
help: try using a conversion method
   |
64 |             expires_at: (chrono::Utc::now() + chrono::Duration::hours(2)).timestamp().to_string(),
   |                                                                                      ++++++++++++

error[E0308]: mismatched types
  --> src-tauri\src\tests\integration\session_repository_test.rs:67:25
   |
67 |             created_at: chrono::Utc::now().timestamp(),
   |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
   |
help: try using a conversion method
   |
67 |             created_at: chrono::Utc::now().timestamp().to_string(),
   |                                                       ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
  --> src-tauri\src\tests\integration\session_repository_test.rs:68:13
   |
68 |             updated_at: chrono::Utc::now().timestamp(),
   |             ^^^^^^^^^^ `models::auth::UserSession` does not have this field
   |
   = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
  --> src-tauri\src\tests\integration\session_repository_test.rs:72:28
   |
72 |         let created = repo.create(&session).expect("Should create session");
   |                            ^^^^^^ method not found in `session_repository::SessionRepository`
   |
  ::: src-tauri\src\repositories\session_repository.rs:13:1
   |
13 | pub struct SessionRepository {
   | ---------------------------- method `create` not found for this struct
   |
   = help: items from traits can only be used if the trait is implemented and in scope
   = note: the following trait defines an item `create`, perhaps you need to implement it:
           candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `get_by_token` found for struct `session_repository::SessionRepository` in the current scope
  --> src-tauri\src\tests\integration\session_repository_test.rs:76:14
   |
75 |           let retrieved = repo
   |  _________________________-
76 | |             .get_by_token(&session.token)
   | |             -^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
   | |_____________|
   |
   |
  ::: src-tauri\src\repositories\session_repository.rs:13:1
   |
13 |   pub struct SessionRepository {
   |   ---------------------------- method `get_by_token` not found for this struct

error[E0599]: no method named `get_by_token` found for struct `session_repository::SessionRepository` in the current scope
  --> src-tauri\src\tests\integration\session_repository_test.rs:89:27
   |
89 |         let result = repo.get_by_token("nonexistent_token");
   |                           ^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
   |
  ::: src-tauri\src\repositories\session_repository.rs:13:1
   |
13 | pub struct SessionRepository {
   | ---------------------------- method `get_by_token` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:104:29
    |
104 |                 expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp(),
    |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
104 |                 expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp().to_string(),
    |                                                                                          ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:107:29
    |
107 |                 created_at: chrono::Utc::now().timestamp(),
    |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
107 |                 created_at: chrono::Utc::now().timestamp().to_string(),
    |                                                           ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:108:17
    |
108 |                 updated_at: chrono::Utc::now().timestamp(),
    |                 ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:115:18
    |
115 |             repo.create(session).expect("Should create session");
    |                  ^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `get_by_user_id` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:120:14
    |
119 |           let user_sessions = repo
    |  _____________________________-
120 | |             .get_by_user_id(&user_id)
    | |             -^^^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
    | |_____________|
    |
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 |   pub struct SessionRepository {
    |   ---------------------------- method `get_by_user_id` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:139:25
    |
139 |             expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp(),
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
139 |             expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp().to_string(),
    |                                                                                      ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:142:25
    |
142 |             created_at: chrono::Utc::now().timestamp(),
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
142 |             created_at: chrono::Utc::now().timestamp().to_string(),
    |                                                       ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:143:13
    |
143 |             updated_at: chrono::Utc::now().timestamp(),
    |             ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:147:28
    |
147 |         let created = repo.create(&session).expect("Should create session");
    |                            ^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `update_activity` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:153:14
    |
152 |           let updated = repo
    |  _______________________-
153 | |             .update_activity(&created.id, "192.168.1.200", "New User Agent")
    | |_____________-^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 |   pub struct SessionRepository {
    |   ---------------------------- method `update_activity` not found for this struct
    |
help: there is a method `update_session_activity` with a similar name, but with different arguments
   --> src-tauri\src\repositories\session_repository.rs:100:5
    |
100 |     pub async fn update_session_activity(&self, session_id: &str) -> Result<(), AppError> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:172:25
    |
172 |             expires_at: (chrono::Utc::now() - chrono::Duration::minutes(30)).timestamp(), // Expired
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
172 |             expires_at: (chrono::Utc::now() - chrono::Duration::minutes(30)).timestamp().to_string(), // Expired
    |                                                                                         ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:175:25
    |
175 |             created_at: chrono::Utc::now().timestamp() - 3600,
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
175 |             created_at: (chrono::Utc::now().timestamp() - 3600).to_string(),
    |                         +                                     +++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:176:13
    |
176 |             updated_at: chrono::Utc::now().timestamp() - 3600,
    |             ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:180:28
    |
180 |         let created = repo.create(&session).expect("Should create session");
    |                            ^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `get_by_token` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:183:27
    |
183 |         let result = repo.get_by_token(&created.token);
    |                           ^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `get_by_token` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:207:25
    |
207 |             expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp(),
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
207 |             expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp().to_string(),
    |                                                                                      ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:210:25
    |
210 |             created_at: chrono::Utc::now().timestamp(),
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
210 |             created_at: chrono::Utc::now().timestamp().to_string(),
    |                                                       ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:211:13
    |
211 |             updated_at: chrono::Utc::now().timestamp(),
    |             ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:215:28
    |
215 |         let created = repo.create(&session).expect("Should create session");
    |                            ^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `delete` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:218:27
    |
218 |         let result = repo.delete(&created.id);
    |                           ^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `delete` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `delete`, perhaps you need to implement it:
            candidate #1: `jsonptr::delete::Delete`

error[E0599]: no method named `get_by_token` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:222:36
    |
222 |         let retrieve_result = repo.get_by_token(&created.token);
    |                                    ^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `get_by_token` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:241:33
    |
241 |                     expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp(),
    |                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
241 |                     expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp().to_string(),
    |                                                                                              ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:244:33
    |
244 |                     created_at: chrono::Utc::now().timestamp(),
    |                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
244 |                     created_at: chrono::Utc::now().timestamp().to_string(),
    |                                                               ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:245:21
    |
245 |                     updated_at: chrono::Utc::now().timestamp(),
    |                     ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:249:36
    |
249 |                 let created = repo.create(&session).expect("Should create session");
    |                                    ^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `delete_all_for_user` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:255:27
    |
255 |         let result = repo.delete_all_for_user(&user_id);
    |                           ^^^^^^^^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `delete_all_for_user` not found for this struct

error[E0599]: no method named `get_connection` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:260:29
    |
260 |             let conn = repo.get_connection().expect("Should get connection");
    |                             ^^^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `get_connection` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:288:29
    |
288 |                 expires_at: (chrono::Utc::now() - chrono::Duration::hours(2)).timestamp(),
    |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
288 |                 expires_at: (chrono::Utc::now() - chrono::Duration::hours(2)).timestamp().to_string(),
    |                                                                                          ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:291:29
    |
291 |                 created_at: chrono::Utc::now().timestamp() - 7200,
    |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
291 |                 created_at: (chrono::Utc::now().timestamp() - 7200).to_string(),
    |                             +                                     +++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:292:17
    |
292 |                 updated_at: chrono::Utc::now().timestamp() - 7200,
    |                 ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:303:29
    |
303 |                 expires_at: (chrono::Utc::now() + chrono::Duration::hours(2)).timestamp(),
    |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
303 |                 expires_at: (chrono::Utc::now() + chrono::Duration::hours(2)).timestamp().to_string(),
    |                                                                                          ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:306:29
    |
306 |                 created_at: chrono::Utc::now().timestamp(),
    |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
306 |                 created_at: chrono::Utc::now().timestamp().to_string(),
    |                                                           ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:307:17
    |
307 |                 updated_at: chrono::Utc::now().timestamp(),
    |                 ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:314:18
    |
314 |             repo.create(session).expect("Should create session");
    |                  ^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `cleanup_expired` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:319:14
    |
318 |           let cleanup_count = repo
    |  _____________________________-
319 | |             .cleanup_expired()
    | |_____________-^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 |   pub struct SessionRepository {
    |   ---------------------------- method `cleanup_expired` not found for this struct
    |
help: there is a method `cleanup_expired_sessions` with a similar name
    |
319 |             .cleanup_expired_sessions()
    |                             +++++++++

error[E0599]: no method named `get_by_token` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:325:31
    |
325 |             let result = repo.get_by_token(&session.token);
    |                               ^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `get_by_token` not found for this struct

error[E0599]: no method named `get_by_token` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:330:31
    |
330 |             let result = repo.get_by_token(&session.token);
    |                               ^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `get_by_token` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:351:29
    |
351 |                 expires_at: (now + chrono::Duration::hours(1)).timestamp(),
    |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
351 |                 expires_at: (now + chrono::Duration::hours(1)).timestamp().to_string(),
    |                                                                           ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:354:29
    |
354 |                 created_at: now.timestamp(),
    |                             ^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
354 |                 created_at: now.timestamp().to_string(),
    |                                            ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:355:17
    |
355 |                 updated_at: now.timestamp(),
    |                 ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:358:18
    |
358 |             repo.create(&session).expect("Should create session");
    |                  ^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:367:29
    |
367 |                 expires_at: (now + chrono::Duration::hours(1)).timestamp(),
    |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
367 |                 expires_at: (now + chrono::Duration::hours(1)).timestamp().to_string(),
    |                                                                           ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:370:29
    |
370 |                 created_at: now.timestamp(),
    |                             ^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
370 |                 created_at: now.timestamp().to_string(),
    |                                            ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:371:17
    |
371 |                 updated_at: now.timestamp(),
    |                 ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:374:18
    |
374 |             repo.create(&session).expect("Should create session");
    |                  ^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:382:25
    |
382 |             expires_at: (now - chrono::Duration::hours(1)).timestamp(),
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
382 |             expires_at: (now - chrono::Duration::hours(1)).timestamp().to_string(),
    |                                                                       ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:385:25
    |
385 |             created_at: now.timestamp(),
    |                         ^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
385 |             created_at: now.timestamp().to_string(),
    |                                        ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:386:13
    |
386 |             updated_at: now.timestamp(),
    |             ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:389:14
    |
389 |         repo.create(&expired_session)
    |              ^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `get_statistics` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:393:26
    |
393 |         let stats = repo.get_statistics().expect("Should get statistics");
    |                          ^^^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `get_statistics` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:415:37
    |
415 |                         expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp(),
    |                                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
415 |                         expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp().to_string(),
    |                                                                                                  ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:418:37
    |
418 |                         created_at: chrono::Utc::now().timestamp(),
    |                                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
418 |                         created_at: chrono::Utc::now().timestamp().to_string(),
    |                                                                   ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:419:25
    |
419 |                         updated_at: chrono::Utc::now().timestamp(),
    |                         ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:423:32
    |
423 |                     repo_clone.create(&session)
    |                                ^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `get_by_user_id` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:444:14
    |
443 |           let user_sessions = repo
    |  _____________________________-
444 | |             .get_by_user_id(&user_id)
    | |             -^^^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
    | |_____________|
    |
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 |   pub struct SessionRepository {
    |   ---------------------------- method `get_by_user_id` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:459:25
    |
459 |             expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp(),
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
459 |             expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp().to_string(),
    |                                                                                      ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:462:25
    |
462 |             created_at: chrono::Utc::now().timestamp(),
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
462 |             created_at: chrono::Utc::now().timestamp().to_string(),
    |                                                       ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:463:13
    |
463 |             updated_at: chrono::Utc::now().timestamp(),
    |             ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:468:14
    |
467 |           let created = repo
    |  _______________________-
468 | |             .create(&suspicious_session)
    | |             -^^^^^^ method not found in `session_repository::SessionRepository`
    | |_____________|
    |
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 |   pub struct SessionRepository {
    |   ---------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `get_by_token` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:473:14
    |
472 |           let retrieved = repo
    |  _________________________-
473 | |             .get_by_token(&created.token)
    | |             -^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
    | |_____________|
    |
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 |   pub struct SessionRepository {
    |   ---------------------------- method `get_by_token` not found for this struct

error[E0599]: no method named `get_security_events` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:482:14
    |
481 |           let security_events = repo
    |  _______________________________-
482 | |             .get_security_events(&user_id)
    | |             -^^^^^^^^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
    | |_____________|
    |
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 |   pub struct SessionRepository {
    |   ---------------------------- method `get_security_events` not found for this struct

error[E0599]: no method named `log_security_event` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:492:18
    |
492 |             repo.log_security_event(
    |             -----^^^^^^^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `log_security_event` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:510:25
    |
510 |             expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp(),
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
510 |             expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp().to_string(),
    |                                                                                      ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:513:25
    |
513 |             created_at: chrono::Utc::now().timestamp(),
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
513 |             created_at: chrono::Utc::now().timestamp().to_string(),
    |                                                       ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:514:13
    |
514 |             updated_at: chrono::Utc::now().timestamp(),
    |             ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:518:27
    |
518 |         let result = repo.create(&session);
    |                           ^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:531:25
    |
531 |             expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp(),
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
531 |             expires_at: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp().to_string(),
    |                                                                                      ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:534:25
    |
534 |             created_at: chrono::Utc::now().timestamp(),
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
534 |             created_at: chrono::Utc::now().timestamp().to_string(),
    |                                                       ++++++++++++

error[E0560]: struct `models::auth::UserSession` has no field named `updated_at`
   --> src-tauri\src\tests\integration\session_repository_test.rs:535:13
    |
535 |             updated_at: chrono::Utc::now().timestamp(),
    |             ^^^^^^^^^^ `models::auth::UserSession` does not have this field
    |
    = note: available fields are: `username`, `email`, `role`, `refresh_token`, `device_info` ... and 3 others

error[E0599]: no method named `create` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:539:28
    |
539 |         let created = repo.create(&session).expect("Should create session");
    |                            ^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `get_connection` found for struct `session_repository::SessionRepository` in the current scope
   --> src-tauri\src\tests\integration\session_repository_test.rs:542:25
    |
542 |         let conn = repo.get_connection().expect("Should get connection");
    |                         ^^^^^^^^^^^^^^ method not found in `session_repository::SessionRepository`
    |
   ::: src-tauri\src\repositories\session_repository.rs:13:1
    |
 13 | pub struct SessionRepository {
    | ---------------------------- method `get_connection` not found for this struct

error[E0599]: no function or associated item named `in_memory` found for struct `db::Database` in the current scope
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:23:24
    |
 23 |     let db = Database::in_memory().expect("Failed to create in-memory database");
    |                        ^^^^^^^^^ function or associated item not found in `db::Database`
    |
   ::: src-tauri\src\db\mod.rs:98:1
    |
 98 | pub struct Database {
    | ------------------- function or associated item `in_memory` not found for this struct
    |
note: if you're trying to build a new `db::Database`, consider using `db::Database::new` which returns `Result<db::Database, std::string::String>`
   --> src-tauri\src\db\mod.rs:246:5
    |
246 |     pub fn new<P: AsRef<Path>>(path: P, encryption_key: &str) -> DbResult<Self> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
help: there is an associated function `new_in_memory` with a similar name
    |
 23 |     let db = Database::new_in_memory().expect("Failed to create in-memory database");
    |                        ++++

error[E0308]: mismatched types
  --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:67:25
   |
67 |         scheduled_date: Some("2024-01-01".to_string()),
   |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `Option<String>`
   |
   = note: expected struct `std::string::String`
                found enum `std::option::Option<std::string::String>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:83:20
    |
 83 |         tags: Some(vec!["test".to_string()]),
    |               ---- ^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `Vec<String>`
    |               |
    |               arguments to this enum variant are incorrect
    |
    = note: expected struct `std::string::String`
               found struct `Vec<std::string::String>`
help: the type constructed contains `Vec<std::string::String>` due to the type of the argument passed
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:83:15
    |
 83 |         tags: Some(vec!["test".to_string()]),
    |               ^^^^^------------------------^
    |                    |
    |                    this argument influences the type of `Some`
note: tuple variant defined here
   --> C:\Users\emaMA\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\core\src\option.rs:601:5
    |
601 |     Some(#[stable(feature = "rust1", since = "1.0.0")] T),
    |     ^^^^

error[E0063]: missing fields `created_by` and `creator_id` in initializer of `models::task::CreateTaskRequest`
  --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:53:5
   |
53 |     CreateTaskRequest {
   |     ^^^^^^^^^^^^^^^^^ missing `created_by` and `creator_id`

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
  --> src-tauri\src\tests\integration\task_repository_test.rs:36:27
   |
36 |         let result = repo.create(&task_request);
   |                           ^^^^^^ method not found in `task_repository::TaskRepository`
   |
  ::: src-tauri\src\repositories\task_repository.rs:15:1
   |
15 | pub struct TaskRepository {
   | ------------------------- method `create` not found for this struct
   |
   = help: items from traits can only be used if the trait is implemented and in scope
   = note: the following trait defines an item `create`, perhaps you need to implement it:
           candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
  --> src-tauri\src\tests\integration\task_repository_test.rs:59:27
   |
59 |         let result = repo.create(&task_request);
   |                           ^^^^^^ method not found in `task_repository::TaskRepository`
   |
  ::: src-tauri\src\repositories\task_repository.rs:15:1
   |
15 | pub struct TaskRepository {
   | ------------------------- method `create` not found for this struct
   |
   = help: items from traits can only be used if the trait is implemented and in scope
   = note: the following trait defines an item `create`, perhaps you need to implement it:
           candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
  --> src-tauri\src\tests\integration\task_repository_test.rs:74:28
   |
74 |         let created = repo.create(&task_request).expect("Should create task");
   |                            ^^^^^^ method not found in `task_repository::TaskRepository`
   |
  ::: src-tauri\src\repositories\task_repository.rs:15:1
   |
15 | pub struct TaskRepository {
   | ------------------------- method `create` not found for this struct
   |
   = help: items from traits can only be used if the trait is implemented and in scope
   = note: the following trait defines an item `create`, perhaps you need to implement it:
           candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `get_by_id` found for struct `task_repository::TaskRepository` in the current scope
  --> src-tauri\src\tests\integration\task_repository_test.rs:76:30
   |
76 |         let retrieved = repo.get_by_id(&created.id).expect("Should retrieve task");
   |                              ^^^^^^^^^
   |
  ::: src-tauri\src\repositories\task_repository.rs:15:1
   |
15 | pub struct TaskRepository {
   | ------------------------- method `get_by_id` not found for this struct
   |
help: there is a method `delete_by_id` with a similar name
   |
76 -         let retrieved = repo.get_by_id(&created.id).expect("Should retrieve task");
76 +         let retrieved = repo.delete_by_id(&created.id).expect("Should retrieve task");
   |

error[E0599]: no method named `get_by_id` found for struct `task_repository::TaskRepository` in the current scope
  --> src-tauri\src\tests\integration\task_repository_test.rs:88:27
   |
88 |         let result = repo.get_by_id(&nonexistent_id);
   |                           ^^^^^^^^^
   |
  ::: src-tauri\src\repositories\task_repository.rs:15:1
   |
15 | pub struct TaskRepository {
   | ------------------------- method `get_by_id` not found for this struct
   |
help: there is a method `delete_by_id` with a similar name
   |
88 -         let result = repo.get_by_id(&nonexistent_id);
88 +         let result = repo.delete_by_id(&nonexistent_id);
   |

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
  --> src-tauri\src\tests\integration\task_repository_test.rs:96:28
   |
96 |         let created = repo.create(&task_request).expect("Should create task");
   |                            ^^^^^^ method not found in `task_repository::TaskRepository`
   |
  ::: src-tauri\src\repositories\task_repository.rs:15:1
   |
15 | pub struct TaskRepository {
   | ------------------------- method `create` not found for this struct
   |
   = help: items from traits can only be used if the trait is implemented and in scope
   = note: the following trait defines an item `create`, perhaps you need to implement it:
           candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `update` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:105:14
    |
104 |           let updated = repo
    |  _______________________-
105 | |             .update(&created.id, &update_request)
    | |             -^^^^^^ method not found in `task_repository::TaskRepository`
    | |_____________|
    |
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `update` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `update`, perhaps you need to implement one of them:
            candidate #1: `Digest`
            candidate #2: `DynDigest`
            candidate #3: `Update`
            candidate #4: `combine::stream::position::Positioner`
            candidate #5: `deflate::checksum::RollingChecksum`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `rayon::iter::ParallelIterator`
            candidate #9: `rustls::crypto::hash::Context`
            candidate #10: `sha2::digest::Mac`

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:119:28
    |
119 |         let created = repo.create(&task_request).expect("Should create task");
    |                            ^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `delete` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:122:27
    |
122 |         let result = repo.delete(&created.id);
    |                           ^^^^^^
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `delete` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `delete`, perhaps you need to implement it:
            candidate #1: `jsonptr::delete::Delete`
help: there is a method `delete_by_id` with a similar name
    |
122 |         let result = repo.delete_by_id(&created.id);
    |                                 ++++++

error[E0599]: no method named `get_by_id` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:126:36
    |
126 |         let retrieve_result = repo.get_by_id(&created.id);
    |                                    ^^^^^^^^^
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `get_by_id` not found for this struct
    |
help: there is a method `delete_by_id` with a similar name
    |
126 -         let retrieve_result = repo.get_by_id(&created.id);
126 +         let retrieve_result = repo.delete_by_id(&created.id);
    |

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:147:18
    |
147 |             repo.create(&task_request).expect("Should create task");
    |                  ^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `find_with_filters` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:152:14
    |
151 |           let found = repo
    |  _____________________-
152 | |             .find_with_filters(
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `find_with_filters` not found for this struct
    |
help: there is a method `find_with_query` with a similar name, but with different arguments
   --> src-tauri\src\repositories\task_repository.rs:26:5
    |
 26 |     pub async fn find_with_query(&self, query: TaskQuery) -> RepoResult<TaskListResponse> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:188:18
    |
188 |             repo.create(&task_request).expect("Should create task");
    |                  ^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `find_with_filters` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:193:14
    |
192 |           let found = repo
    |  _____________________-
193 | |             .find_with_filters(
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `find_with_filters` not found for this struct
    |
help: there is a method `find_with_query` with a similar name, but with different arguments
   --> src-tauri\src\repositories\task_repository.rs:26:5
    |
 26 |     pub async fn find_with_query(&self, query: TaskQuery) -> RepoResult<TaskListResponse> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:229:18
    |
229 |             repo.create(&task_request).expect("Should create task");
    |                  ^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `find_with_filters` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:234:14
    |
233 |           let found = repo
    |  _____________________-
234 | |             .find_with_filters(None, None, Some("PPF"), None, None, 10, 0)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `find_with_filters` not found for this struct
    |
help: there is a method `find_with_query` with a similar name, but with different arguments
   --> src-tauri\src\repositories\task_repository.rs:26:5
    |
 26 |     pub async fn find_with_query(&self, query: TaskQuery) -> RepoResult<TaskListResponse> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `find_with_filters` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:243:14
    |
242 |           let found = repo
    |  _____________________-
243 | |             .find_with_filters(None, None, Some("Tesla"), None, None, 10, 0)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `find_with_filters` not found for this struct
    |
help: there is a method `find_with_query` with a similar name, but with different arguments
   --> src-tauri\src\repositories\task_repository.rs:26:5
    |
 26 |     pub async fn find_with_query(&self, query: TaskQuery) -> RepoResult<TaskListResponse> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:259:18
    |
259 |             repo.create(&task_request).expect("Should create task");
    |                  ^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `find_with_filters` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:264:14
    |
263 |           let page1 = repo
    |  _____________________-
264 | |             .find_with_filters(None, None, None, None, None, 10, 0)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `find_with_filters` not found for this struct
    |
help: there is a method `find_with_query` with a similar name, but with different arguments
   --> src-tauri\src\repositories\task_repository.rs:26:5
    |
 26 |     pub async fn find_with_query(&self, query: TaskQuery) -> RepoResult<TaskListResponse> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `find_with_filters` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:267:14
    |
266 |           let page2 = repo
    |  _____________________-
267 | |             .find_with_filters(None, None, None, None, None, 10, 1)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `find_with_filters` not found for this struct
    |
help: there is a method `find_with_query` with a similar name, but with different arguments
   --> src-tauri\src\repositories\task_repository.rs:26:5
    |
 26 |     pub async fn find_with_query(&self, query: TaskQuery) -> RepoResult<TaskListResponse> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `find_with_filters` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:270:14
    |
269 |           let page3 = repo
    |  _____________________-
270 | |             .find_with_filters(None, None, None, None, None, 10, 2)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `find_with_filters` not found for this struct
    |
help: there is a method `find_with_query` with a similar name, but with different arguments
   --> src-tauri\src\repositories\task_repository.rs:26:5
    |
 26 |     pub async fn find_with_query(&self, query: TaskQuery) -> RepoResult<TaskListResponse> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:309:18
    |
309 |             repo.create(&task_request).expect("Should create task");
    |                  ^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `find_with_filters` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:314:14
    |
313 |           let found = repo
    |  _____________________-
314 | |             .find_with_filters(None, None, None, Some("created_at"), Some("asc"), 10, 0)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `find_with_filters` not found for this struct
    |
help: there is a method `find_with_query` with a similar name, but with different arguments
   --> src-tauri\src\repositories\task_repository.rs:26:5
    |
 26 |     pub async fn find_with_query(&self, query: TaskQuery) -> RepoResult<TaskListResponse> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `find_with_filters` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:324:14
    |
323 |           let found = repo
    |  _____________________-
324 | |             .find_with_filters(None, None, None, Some("created_at"), Some("desc"), 10, 0)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `find_with_filters` not found for this struct
    |
help: there is a method `find_with_query` with a similar name, but with different arguments
   --> src-tauri\src\repositories\task_repository.rs:26:5
    |
 26 |     pub async fn find_with_query(&self, query: TaskQuery) -> RepoResult<TaskListResponse> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:348:22
    |
348 |                 repo.create(&task_request).expect("Should create task");
    |                      ^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: `task_repository::TaskRepository` is not an iterator
   --> src-tauri\src\tests\integration\task_repository_test.rs:353:32
    |
353 |         let total_count = repo.count(None, None).expect("Should count all tasks");
    |                                ^^^^^ `task_repository::TaskRepository` is not an iterator
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `count` not found for this struct because it doesn't satisfy `task_repository::TaskRepository: Iterator`
    |
    = note: the following trait bounds were not satisfied:
            `task_repository::TaskRepository: Iterator`
            which is required by `&mut task_repository::TaskRepository: Iterator`
note: the trait `Iterator` must be implemented
   --> C:\Users\emaMA\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\core\src\iter\traits\iterator.rs:39:1
    |
 39 | pub trait Iterator {
    | ^^^^^^^^^^^^^^^^^^
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `count`, perhaps you need to implement one of them:
            candidate #1: `BitSetLike`
            candidate #2: `Iterator`
            candidate #3: `StreamExt`
            candidate #4: `fallible_iterator::FallibleIterator`
            candidate #5: `fallible_streaming_iterator::FallibleStreamingIterator`
            candidate #6: `rayon::iter::ParallelIterator`

error[E0599]: `task_repository::TaskRepository` is not an iterator
   --> src-tauri\src\tests\integration\task_repository_test.rs:358:14
    |
357 |           let draft_count = repo
    |  ___________________________-
358 | |             .count(Some(&vec!["draft".to_string()]), None)
    | |             -^^^^^ `task_repository::TaskRepository` is not an iterator
    | |_____________|
    |
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `count` not found for this struct because it doesn't satisfy `task_repository::TaskRepository: Iterator`
    |
    = note: the following trait bounds were not satisfied:
            `task_repository::TaskRepository: Iterator`
            which is required by `&mut task_repository::TaskRepository: Iterator`
note: the trait `Iterator` must be implemented
   --> C:\Users\emaMA\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\core\src\iter\traits\iterator.rs:39:1
    |
 39 | pub trait Iterator {
    | ^^^^^^^^^^^^^^^^^^
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `count`, perhaps you need to implement one of them:
            candidate #1: `BitSetLike`
            candidate #2: `Iterator`
            candidate #3: `StreamExt`
            candidate #4: `fallible_iterator::FallibleIterator`
            candidate #5: `fallible_streaming_iterator::FallibleStreamingIterator`
            candidate #6: `rayon::iter::ParallelIterator`

error[E0599]: `task_repository::TaskRepository` is not an iterator
   --> src-tauri\src\tests\integration\task_repository_test.rs:363:14
    |
362 |           let completed_count = repo
    |  _______________________________-
363 | |             .count(Some(&vec!["completed".to_string()]), None)
    | |             -^^^^^ `task_repository::TaskRepository` is not an iterator
    | |_____________|
    |
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `count` not found for this struct because it doesn't satisfy `task_repository::TaskRepository: Iterator`
    |
    = note: the following trait bounds were not satisfied:
            `task_repository::TaskRepository: Iterator`
            which is required by `&mut task_repository::TaskRepository: Iterator`
note: the trait `Iterator` must be implemented
   --> C:\Users\emaMA\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\core\src\iter\traits\iterator.rs:39:1
    |
 39 | pub trait Iterator {
    | ^^^^^^^^^^^^^^^^^^
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `count`, perhaps you need to implement one of them:
            candidate #1: `BitSetLike`
            candidate #2: `Iterator`
            candidate #3: `StreamExt`
            candidate #4: `fallible_iterator::FallibleIterator`
            candidate #5: `fallible_streaming_iterator::FallibleStreamingIterator`
            candidate #6: `rayon::iter::ParallelIterator`

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:384:22
    |
384 |                 repo.create(&task_request).expect("Should create task");
    |                      ^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `get_statistics` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:388:26
    |
388 |         let stats = repo.get_statistics().expect("Should get statistics");
    |                          ^^^^^^^^^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `get_statistics` not found for this struct

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:439:18
    |
439 |             repo.create(&task_request).expect("Should create task");
    |                  ^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `find_with_filters` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:444:14
    |
443 |           let found = repo
    |  _____________________-
444 | |             .find_with_filters(
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `find_with_filters` not found for this struct
    |
help: there is a method `find_with_query` with a similar name, but with different arguments
   --> src-tauri\src\repositories\task_repository.rs:26:5
    |
 26 |     pub async fn find_with_query(&self, query: TaskQuery) -> RepoResult<TaskListResponse> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:475:27
    |
475 |         let result = repo.create(&task_request);
    |                           ^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:484:27
    |
484 |         let result = repo.create(&task_request);
    |                           ^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:494:28
    |
494 |         let created = repo.create(&task_request).expect("Should create task");
    |                            ^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `get_connection` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:497:25
    |
497 |         let conn = repo.get_connection().expect("Should get connection");
    |                         ^^^^^^^^^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `get_connection` not found for this struct

error[E0599]: no method named `create` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:541:18
    |
541 |             repo.create(&task_request).expect("Should create task");
    |                  ^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `create`, perhaps you need to implement it:
            candidate #1: `regex_syntax::hir::interval::Interval`

error[E0599]: no method named `find_with_filters` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:550:14
    |
549 |           let found = repo
    |  _____________________-
550 | |             .find_with_filters(None, None, None, None, None, 50, 0)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 |   pub struct TaskRepository {
    |   ------------------------- method `find_with_filters` not found for this struct
    |
help: there is a method `find_with_query` with a similar name, but with different arguments
   --> src-tauri\src\repositories\task_repository.rs:26:5
    |
 26 |     pub async fn find_with_query(&self, query: TaskQuery) -> RepoResult<TaskListResponse> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `create_with_transaction` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:571:27
    |
571 |         let result = repo.create_with_transaction(|conn| {
    |                      -----^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create_with_transaction` not found for this struct

error[E0599]: no method named `create_in_transaction` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:573:30
    |
573 |             let task1 = repo.create_in_transaction(&task_request1, conn)?;
    |                              ^^^^^^^^^^^^^^^^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create_in_transaction` not found for this struct

error[E0599]: no method named `create_in_transaction` found for struct `task_repository::TaskRepository` in the current scope
   --> src-tauri\src\tests\integration\task_repository_test.rs:579:24
    |
579 |             match repo.create_in_transaction(&invalid_task, conn) {
    |                        ^^^^^^^^^^^^^^^^^^^^^ method not found in `task_repository::TaskRepository`
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `create_in_transaction` not found for this struct

error[E0599]: `task_repository::TaskRepository` is not an iterator
   --> src-tauri\src\tests\integration\task_repository_test.rs:601:30
    |
601 |         let all_count = repo.count(None, None).expect("Should count all tasks");
    |                              ^^^^^ `task_repository::TaskRepository` is not an iterator
    |
   ::: src-tauri\src\repositories\task_repository.rs:15:1
    |
 15 | pub struct TaskRepository {
    | ------------------------- method `count` not found for this struct because it doesn't satisfy `task_repository::TaskRepository: Iterator`
    |
    = note: the following trait bounds were not satisfied:
            `task_repository::TaskRepository: Iterator`
            which is required by `&mut task_repository::TaskRepository: Iterator`
note: the trait `Iterator` must be implemented
   --> C:\Users\emaMA\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\core\src\iter\traits\iterator.rs:39:1
    |
 39 | pub trait Iterator {
    | ^^^^^^^^^^^^^^^^^^
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `count`, perhaps you need to implement one of them:
            candidate #1: `BitSetLike`
            candidate #2: `Iterator`
            candidate #3: `StreamExt`
            candidate #4: `fallible_iterator::FallibleIterator`
            candidate #5: `fallible_streaming_iterator::FallibleStreamingIterator`
            candidate #6: `rayon::iter::ParallelIterator`

error[E0599]: no method named `get_task_by_id_async` found for struct `task_crud::TaskCrudService` in the current scope
  --> src-tauri\src\tests\integration\workflow_tests.rs:58:14
   |
57 |           let updated_task = task_service
   |  ____________________________-
58 | |             .get_task_by_id_async(&created_task.id)
   | |             -^^^^^^^^^^^^^^^^^^^^ method not found in `task_crud::TaskCrudService`
   | |_____________|
   |
   |
  ::: src-tauri\src\services\task_crud.rs:12:1
   |
12 |   pub struct TaskCrudService {
   |   -------------------------- method `get_task_by_id_async` not found for this struct

error[E0061]: this method takes 3 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\integration\workflow_tests.rs:120:14
    |
120 |             .advance_step(advance_request, "test_user")
    |              ^^^^^^^^^^^^------------------------------ argument #3 of type `std::option::Option<&str>` is missing
    |
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:311:18
    |
311 |     pub async fn advance_step(
    |                  ^^^^^^^^^^^^
...
315 |         user_id: Option<&str>,
    |         ---------------------
help: provide the argument
    |
120 |             .advance_step(advance_request, "test_user", /* std::option::Option<&str> */)
    |                                                       +++++++++++++++++++++++++++++++++

error[E0061]: this method takes 3 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\integration\workflow_tests.rs:173:18
    |
173 |                 .advance_step(advance_request, "test_user")
    |                  ^^^^^^^^^^^^------------------------------ argument #3 of type `std::option::Option<&str>` is missing
    |
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:311:18
    |
311 |     pub async fn advance_step(
    |                  ^^^^^^^^^^^^
...
315 |         user_id: Option<&str>,
    |         ---------------------
help: provide the argument
    |
173 |                 .advance_step(advance_request, "test_user", /* std::option::Option<&str> */)
    |                                                           +++++++++++++++++++++++++++++++++

error[E0599]: no method named `complete_intervention` found for struct `services::intervention_workflow::InterventionWorkflowService` in the current scope
   --> src-tauri\src\tests\integration\workflow_tests.rs:187:14
    |
186 | /         intervention_service
187 | |             .complete_intervention(complete_request, "test_user")
    | |_____________-^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\intervention_workflow.rs:26:1
    |
 26 |   pub struct InterventionWorkflowService {
    |   -------------------------------------- method `complete_intervention` not found for this struct
    |
help: there is a method `finalize_intervention` with a similar name, but with different arguments
   --> src-tauri\src\services\intervention_workflow.rs:652:5
    |
652 | /     pub fn finalize_intervention(
653 | |         &self,
654 | |         request: FinalizeInterventionRequest,
655 | |         correlation_id: &str,
656 | |         user_id: Option<&str>,
657 | |     ) -> InterventionResult<FinalizeInterventionResponse> {
    | |_________________________________________________________^

error[E0599]: no method named `get_task_by_id_async` found for struct `task_crud::TaskCrudService` in the current scope
   --> src-tauri\src\tests\integration\workflow_tests.rs:192:14
    |
191 |           let updated_task = task_service
    |  ____________________________-
192 | |             .get_task_by_id_async(&created_task.id)
    | |             -^^^^^^^^^^^^^^^^^^^^ method not found in `task_crud::TaskCrudService`
    | |_____________|
    |
    |
   ::: src-tauri\src\services\task_crud.rs:12:1
    |
 12 |   pub struct TaskCrudService {
    |   -------------------------- method `get_task_by_id_async` not found for this struct

error[E0599]: no method named `cancel_intervention` found for struct `services::intervention_workflow::InterventionWorkflowService` in the current scope
   --> src-tauri\src\tests\integration\workflow_tests.rs:235:14
    |
234 | /         intervention_service
235 | |             .cancel_intervention(cancel_request, "test_user")
    | |_____________-^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\intervention_workflow.rs:26:1
    |
 26 |   pub struct InterventionWorkflowService {
    |   -------------------------------------- method `cancel_intervention` not found for this struct
    |
help: there is a method `start_intervention` with a similar name, but with different arguments
   --> src-tauri\src\services\intervention_workflow.rs:43:5
    |
 43 | /     pub fn start_intervention(
 44 | |         &self,
 45 | |         request: StartInterventionRequest,
 46 | |         user_id: &str,
 47 | |         correlation_id: &str,
 48 | |     ) -> InterventionResult<StartInterventionResponse> {
    | |______________________________________________________^

error[E0599]: no method named `get_task_by_id_async` found for struct `task_crud::TaskCrudService` in the current scope
   --> src-tauri\src\tests\integration\workflow_tests.rs:240:14
    |
239 |           let updated_task = task_service
    |  ____________________________-
240 | |             .get_task_by_id_async(&created_task.id)
    | |             -^^^^^^^^^^^^^^^^^^^^ method not found in `task_crud::TaskCrudService`
    | |_____________|
    |
    |
   ::: src-tauri\src\services\task_crud.rs:12:1
    |
 12 |   pub struct TaskCrudService {
    |   -------------------------- method `get_task_by_id_async` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\workflow_tests.rs:294:9
    |
249 |     fn test_duplicate_intervention_prevention() {
    |                                                - help: a return type might be missing here: `-> _`
...
294 |         Ok(())
    |         ^^^^^^ expected `()`, found `Result<(), _>`
    |
    = note: expected unit type `()`
                    found enum `Result<(), _>`

error[E0061]: this method takes 3 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\integration\workflow_tests.rs:336:14
    |
336 |             .advance_step(advance_request, "test_user")
    |              ^^^^^^^^^^^^------------------------------ argument #3 of type `std::option::Option<&str>` is missing
    |
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:311:18
    |
311 |     pub async fn advance_step(
    |                  ^^^^^^^^^^^^
...
315 |         user_id: Option<&str>,
    |         ---------------------
help: provide the argument
    |
336 |             .advance_step(advance_request, "test_user", /* std::option::Option<&str> */)
    |                                                       +++++++++++++++++++++++++++++++++

error[E0277]: the trait bound `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:28:5
    |
 28 | /     proptest! {
 29 | |         #![proptest_config(ProptestConfig::with_cases(100))]
 30 | |
 31 | |         #[test]
...   |
210 | |     }
    | |_____^ the trait `proptest::strategy::Strategy` is not implemented for `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>`
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others
    = note: required for `(Result<RegexGeneratorStrategy<String>, Error>, Result<RegexGeneratorStrategy<String>, Error>)` to implement `proptest::strategy::Strategy`
    = note: the full name for the type has been written to 'D:\rpma-rust\src-tauri\target\debug\deps\rpma_ppf_intervention-c4da74d6cbf03e8a.long-type-2220777181359753813.txt'
    = note: consider using `--verbose` to print the full type name to the console
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0277]: the size for values of type `str` cannot be known at compilation time
  --> src-tauri\src\tests\proptests\auth_service_proptests.rs:33:13
   |
33 |             first_name in prop::string::string_regex(r"[a-zA-Zàèéìòù]{2,20}"),
   |             ^^^^^^^^^^ doesn't have a size known at compile-time
   |
   = help: the trait `Sized` is not implemented for `str`
   = note: all local variables must have a statically known size

error[E0277]: the size for values of type `str` cannot be known at compilation time
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:28:5
    |
 28 | /     proptest! {
 29 | |         #![proptest_config(ProptestConfig::with_cases(100))]
 30 | |
 31 | |         #[test]
...   |
210 | |     }
    | |_____^ doesn't have a size known at compile-time
    |
    = help: the trait `Sized` is not implemented for `str`
    = help: the following other types implement trait `Debug`:
              NamedArguments<&str, V>
              NamedArguments<(AN, BN), &(AV, BV)>
              NamedArguments<(AN, BN), (AV, BV)>
              NamedArguments<(AN, BN, CN), &(AV, BV, CV)>
              NamedArguments<(AN, BN, CN), (AV, BV, CV)>
              NamedArguments<(AN, BN, CN, DN), &(AV, BV, CV, DV)>
              NamedArguments<(AN, BN, CN, DN), (AV, BV, CV, DV)>
              NamedArguments<(AN, BN, CN, DN, EN), &(AV, BV, CV, DV, EV)>
            and 13 others
    = note: required for `NamedArguments<(&str, &str), (str, _)>` to implement `Debug`
note: required by a bound in `prop_map`
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\proptest-1.10.0\src\strategy\traits.rs:74:20
    |
 74 |     fn prop_map<O: fmt::Debug, F: Fn(Self::Value) -> O>(
    |                    ^^^^^^^^^^ required by this bound in `Strategy::prop_map`
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0277]: the size for values of type `str` cannot be known at compilation time
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:28:5
    |
 28 | /     proptest! {
 29 | |         #![proptest_config(ProptestConfig::with_cases(100))]
 30 | |
 31 | |         #[test]
...   |
210 | |     }
    | |_____^ doesn't have a size known at compile-time
    |
    = help: the trait `Sized` is not implemented for `str`
    = note: only the last element of a tuple may have a dynamically sized type
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0277]: the size for values of type `str` cannot be known at compilation time
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:28:5
    |
 28 | /     proptest! {
 29 | |         #![proptest_config(ProptestConfig::with_cases(100))]
 30 | |
 31 | |         #[test]
...   |
210 | |     }
    | |     ^
    | |     |
    | |_____doesn't have a size known at compile-time
    |       required by a bound introduced by this call
    |
    = help: the trait `Sized` is not implemented for `str`
    = help: the trait `proptest::strategy::Strategy` is implemented for `proptest::strategy::Map<S, F>`
    = note: required for `NamedArguments<(&'static str, &'static str), (str, _)>` to implement `Debug`
    = note: required for `Map<(Result<RegexGeneratorStrategy<String>, Error>, Result<RegexGeneratorStrategy<String>, Error>), ...>` to implement `proptest::strategy::Strategy`
note: required by a bound in `TestRunner::run`
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\proptest-1.10.0\src\test_runner\runner.rs:410:19
    |
410 |     pub fn run<S: Strategy>(
    |                   ^^^^^^^^ required by this bound in `TestRunner::run`
    = note: the full name for the type has been written to 'D:\rpma-rust\src-tauri\target\debug\deps\rpma_ppf_intervention-c4da74d6cbf03e8a.long-type-14668542143530239745.txt'
    = note: consider using `--verbose` to print the full type name to the console
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0277]: the size for values of type `str` cannot be known at compilation time
  --> src-tauri\src\tests\proptests\auth_service_proptests.rs:34:13
   |
34 |             last_name in prop::string::string_regex(r"[a-zA-Zàèéìòù]{2,20}")
   |             ^^^^^^^^^ doesn't have a size known at compile-time
   |
   = help: the trait `Sized` is not implemented for `str`
   = note: all local variables must have a statically known size

error[E0599]: no method named `is_lowercase` found for struct `std::string::String` in the current scope
  --> src-tauri\src\tests\proptests\auth_service_proptests.rs:44:35
   |
44 |             prop_assert!(username.is_lowercase());
   |                                   ^^^^^^^^^^^^
   |
help: there is a method `to_lowercase` with a similar name
   |
44 -             prop_assert!(username.is_lowercase());
44 +             prop_assert!(username.to_lowercase());
   |

error[E0277]: the size for values of type `str` cannot be known at compilation time
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:28:5
    |
 28 | /     proptest! {
 29 | |         #![proptest_config(ProptestConfig::with_cases(100))]
 30 | |
 31 | |         #[test]
...   |
210 | |     }
    | |_____^ doesn't have a size known at compile-time
    |
    = help: the trait `Sized` is not implemented for `str`
    = note: only the last element of a tuple may have a dynamically sized type
    = note: this error originates in the macro `$crate::const_format_args` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0308]: mismatched types
  --> src-tauri\src\tests\proptests\auth_service_proptests.rs:62:36
   |
62 |             signup_request.email = email;
   |             --------------------   ^^^^^ expected `Option<String>`, found `String`
   |             |
   |             expected due to the type of this binding
   |
   = note: expected enum `std::option::Option<std::string::String>`
            found struct `std::string::String`
help: try wrapping the expression in `Some`
   |
62 |             signup_request.email = Some(email);
   |                                    +++++     +

error[E0599]: no method named `contains` found for enum `std::option::Option` in the current scope
    --> src-tauri\src\tests\proptests\auth_service_proptests.rs:65:47
     |
  65 |             prop_assert!(signup_request.email.contains('@'));
     |                                               ^^^^^^^^ method not found in `std::option::Option<std::string::String>`
     |
    ::: C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\option-ext-0.2.0\src\lib.rs:22:8
     |
  22 |     fn contains<U>(&self, x: &U) -> bool where U: PartialEq<T>;
     |        -------- the method is available for `std::option::Option<std::string::String>` here
     |
note: the method `contains` exists on the type `std::string::String`
    --> C:\Users\emaMA\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\core\src\str\mod.rs:1340:5
     |
1340 |     pub fn contains<P: Pattern>(&self, pat: P) -> bool {
     |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     = help: items from traits can only be used if the trait is in scope
help: consider using `Option::expect` to unwrap the `std::string::String` value, panicking if the value is an `Option::None`
     |
  65 |             prop_assert!(signup_request.email.expect("REASON").contains('@'));
     |                                              +++++++++++++++++
help: trait `OptionExt` which provides `contains` is implemented but not in scope; perhaps you want to import it
     |
  16 +     use option_ext::OptionExt;
     |

error[E0624]: method `len` is private
    --> src-tauri\src\tests\proptests\auth_service_proptests.rs:66:47
     |
  66 |             prop_assert!(signup_request.email.len() <= 254);
     |                                               ^^^ private method
     |
    ::: C:\Users\emaMA\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\core\src\option.rs:803:5
     |
 803 |     const fn len(&self) -> usize {
     |     ---------------------------- private method defined here
     |
note: the method `len` exists on the type `std::string::String`
    --> C:\Users\emaMA\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\alloc\src\string.rs:1854:5
     |
1854 |     pub const fn len(&self) -> usize {
     |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
help: consider using `Option::expect` to unwrap the `std::string::String` value, panicking if the value is an `Option::None`
     |
  66 |             prop_assert!(signup_request.email.expect("REASON").len() <= 254);
     |                                              +++++++++++++++++

error[E0277]: the trait bound `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:71:25
    |
 28 | /     proptest! {
 29 | |         #![proptest_config(ProptestConfig::with_cases(100))]
 30 | |
 31 | |         #[test]
...   |
 71 | |             password in prop::string::string_regex(r".{1,50}")
    | |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ the trait `proptest::strategy::Strategy` is not implemented for `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Erro
r>`
...   |
210 | |     }
    | |_____- required by a bound introduced by this call
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others

error[E0277]: the trait bound `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:28:5
    |
 28 | /     proptest! {
 29 | |         #![proptest_config(ProptestConfig::with_cases(100))]
 30 | |
 31 | |         #[test]
...   |
210 | |     }
    | |_____^ the trait `proptest::strategy::Strategy` is not implemented for `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>`
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others
    = note: required for `Map<Result<RegexGeneratorStrategy<String>, Error>, {closure@sugar.rs:972:17}>` to implement `proptest::strategy::Strategy`
    = note: the full name for the type has been written to 'D:\rpma-rust\src-tauri\target\debug\deps\rpma_ppf_intervention-c4da74d6cbf03e8a.long-type-5917471386134174233.txt'
    = note: consider using `--verbose` to print the full type name to the console
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0277]: the trait bound `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:28:5
    |
 28 | /     proptest! {
 29 | |         #![proptest_config(ProptestConfig::with_cases(100))]
 30 | |
 31 | |         #[test]
...   |
210 | |     }
    | |_____^ the trait `proptest::strategy::Strategy` is not implemented for `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>`
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others
    = note: required for `(Result<RegexGeneratorStrategy<String>, Error>, TupleUnion<((u32, Arc<&str>), (u32, ...), ..., ...)>)` to implement `proptest::strategy::Strategy`
    = note: the full name for the type has been written to 'D:\rpma-rust\src-tauri\target\debug\deps\rpma_ppf_intervention-c4da74d6cbf03e8a.long-type-14575263069375153881.txt'
    = note: consider using `--verbose` to print the full type name to the console
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0277]: the trait bound `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:28:5
    |
 28 | /     proptest! {
 29 | |         #![proptest_config(ProptestConfig::with_cases(100))]
 30 | |
 31 | |         #[test]
...   |
210 | |     }
    | |_____^ the trait `proptest::strategy::Strategy` is not implemented for `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>`
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others
    = note: required for `(Result<RegexGeneratorStrategy<String>, Error>, TupleUnion<((u32, Arc<&str>), (u32, ...), ..., ...)>)` to implement `proptest::strategy::Strategy`
    = note: 1 redundant requirement hidden
    = note: required for `Map<(Result<RegexGeneratorStrategy<String>, Error>, TupleUnion<((u32, Arc<&str>), ..., ..., ...)>), ...>` to implement `proptest::strategy::Strategy`
    = note: the full name for the type has been written to 'D:\rpma-rust\src-tauri\target\debug\deps\rpma_ppf_intervention-c4da74d6cbf03e8a.long-type-5023983735747941528.txt'
    = note: consider using `--verbose` to print the full type name to the console
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0599]: no function or associated item named `create_test_user` found for struct `test_utils::TestDataFactory` in the current scope
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:132:53
    |
132 |             let mut user_request = TestDataFactory::create_test_user(None);
    |                                                     ^^^^^^^^^^^^^^^^ function or associated item not found in `test_utils::TestDataFactory`
    |
   ::: src-tauri\src\test_utils.rs:51:1
    |
 51 | pub struct TestDataFactory;
    | -------------------------- function or associated item `create_test_user` not found for this struct
    |
help: there is an associated function `create_test_step` with a similar name
   --> src-tauri\src\test_utils.rs:196:5
    |
196 | /     pub fn create_test_step(
197 | |         intervention_id: &str,
198 | |         step_number: i32,
199 | |         overrides: Option<InterventionStep>,
200 | |     ) -> InterventionStep {
    | |_________________________^

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:135:38
    |
135 |             let _user = auth_service.create_account(user_request, &ip_address).unwrap();
    |                                      ^^^^^^^^^^^^^^--------------------------- multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
...
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
135 |             let _user = auth_service.create_account(user_request, &ip_address, /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */).unwrap();
    |                                                                              ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:141:17
    |
138 |             let result = auth_service.authenticate(
    |                                       ------------ arguments to this method are incorrect
...
141 |                 &ip_address
    |                 ^^^^^^^^^^^ expected `Option<&str>`, found `&String`
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&std::string::String`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
141 |                 Some(&ip_address)
    |                 +++++           +

error[E0277]: can't compare `std::string::String` with `chrono::DateTime<chrono::Utc>`
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:151:45
    |
151 |             prop_assert!(session.expires_at > chrono::Utc::now());
    |                                             ^ no implementation for `std::string::String < chrono::DateTime<chrono::Utc>` and `std::string::String > chrono::DateTime<chrono::Utc>`
    |
    = help: the trait `PartialOrd<chrono::DateTime<chrono::Utc>>` is not implemented for `std::string::String`
    = help: the following other types implement trait `PartialOrd<Rhs>`:
              `std::string::String` implements `PartialOrd<&bstr::bstr::BStr>`
              `std::string::String` implements `PartialOrd<&camino::Utf8Path>`
              `std::string::String` implements `PartialOrd<Authority>`
              `std::string::String` implements `PartialOrd<HeaderValue>`
              `std::string::String` implements `PartialOrd<PathAndQuery>`
              `std::string::String` implements `PartialOrd<bstr::bstr::BStr>`
              `std::string::String` implements `PartialOrd<bstr::bstring::BString>`
              `std::string::String` implements `PartialOrd<bytes::bytes_mut::BytesMut>`
            and 16 others

error[E0277]: the trait bound `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:28:5
    |
 28 | /     proptest! {
 29 | |         #![proptest_config(ProptestConfig::with_cases(100))]
 30 | |
 31 | |         #[test]
...   |
210 | |     }
    | |_____^ the trait `proptest::strategy::Strategy` is not implemented for `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>`
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others
    = note: required for `(Result<RegexGeneratorStrategy<String>, Error>, TupleUnion<((u32, Arc<&str>), (u32, Arc<&str>), ...)>)` to implement `proptest::strategy::Strategy`
    = note: the full name for the type has been written to 'D:\rpma-rust\src-tauri\target\debug\deps\rpma_ppf_intervention-c4da74d6cbf03e8a.long-type-100825187251555926.txt'
    = note: consider using `--verbose` to print the full type name to the console
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0277]: the trait bound `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:28:5
    |
 28 | /     proptest! {
 29 | |         #![proptest_config(ProptestConfig::with_cases(100))]
 30 | |
 31 | |         #[test]
...   |
210 | |     }
    | |_____^ the trait `proptest::strategy::Strategy` is not implemented for `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>`
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others
    = note: required for `(Result<RegexGeneratorStrategy<String>, Error>, TupleUnion<((u32, Arc<&str>), (u32, Arc<&str>), ...)>)` to implement `proptest::strategy::Strategy`
    = note: 1 redundant requirement hidden
    = note: required for `Map<(Result<RegexGeneratorStrategy<String>, Error>, TupleUnion<((u32, Arc<&str>), ..., ...)>), ...>` to implement `proptest::strategy::Strategy`
    = note: the full name for the type has been written to 'D:\rpma-rust\src-tauri\target\debug\deps\rpma_ppf_intervention-c4da74d6cbf03e8a.long-type-8578080301558219526.txt'
    = note: consider using `--verbose` to print the full type name to the console
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0599]: no function or associated item named `create_test_user` found for struct `test_utils::TestDataFactory` in the current scope
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:167:53
    |
167 |             let mut user_request = TestDataFactory::create_test_user(None);
    |                                                     ^^^^^^^^^^^^^^^^ function or associated item not found in `test_utils::TestDataFactory`
    |
   ::: src-tauri\src\test_utils.rs:51:1
    |
 51 | pub struct TestDataFactory;
    | -------------------------- function or associated item `create_test_user` not found for this struct
    |
help: there is an associated function `create_test_step` with a similar name
   --> src-tauri\src\test_utils.rs:196:5
    |
196 | /     pub fn create_test_step(
197 | |         intervention_id: &str,
198 | |         step_number: i32,
199 | |         overrides: Option<InterventionStep>,
200 | |     ) -> InterventionStep {
    | |_________________________^

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:170:38
    |
170 |             let _user = auth_service.create_account(user_request, &ip_address).unwrap();
    |                                      ^^^^^^^^^^^^^^--------------------------- multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
...
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
170 |             let _user = auth_service.create_account(user_request, &ip_address, /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */).unwrap();
    |                                                                              ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:175:82
    |
175 |                 let result = auth_service.authenticate(&email, "wrong_password", &ip_address);
    |                                           ------------                           ^^^^^^^^^^^ expected `Option<&str>`, found `&String`
    |                                           |
    |                                           arguments to this method are incorrect
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&std::string::String`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
175 |                 let result = auth_service.authenticate(&email, "wrong_password", Some(&ip_address));
    |                                                                                  +++++           +

error[E0599]: no function or associated item named `create_test_user` found for struct `test_utils::TestDataFactory` in the current scope
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:195:53
    |
195 |             let mut user_request = TestDataFactory::create_test_user(None);
    |                                                     ^^^^^^^^^^^^^^^^ function or associated item not found in `test_utils::TestDataFactory`
    |
   ::: src-tauri\src\test_utils.rs:51:1
    |
 51 | pub struct TestDataFactory;
    | -------------------------- function or associated item `create_test_user` not found for this struct
    |
help: there is an associated function `create_test_step` with a similar name
   --> src-tauri\src\test_utils.rs:196:5
    |
196 | /     pub fn create_test_step(
197 | |         intervention_id: &str,
198 | |         step_number: i32,
199 | |         overrides: Option<InterventionStep>,
200 | |     ) -> InterventionStep {
    | |_________________________^

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:198:37
    |
198 |             let user = auth_service.create_account(user_request, "127.0.0.1").unwrap();
    |                                     ^^^^^^^^^^^^^^--------------------------- multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
...
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
198 |             let user = auth_service.create_account(user_request, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */).unwrap();
    |                                                                             ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

error[E0061]: this method takes 2 arguments but 3 arguments were supplied
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:201:39
    |
201 |             let result = auth_service.change_password(&user.id, &old_password, &new_password);
    |                                       ^^^^^^^^^^^^^^^           ------------- unexpected argument #2
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:942:12
    |
942 |     pub fn change_password(&self, user_id: &str, new_password: &str) -> Result<(), String> {
    |            ^^^^^^^^^^^^^^^
help: remove the extra argument
    |
201 -             let result = auth_service.change_password(&user.id, &old_password, &new_password);
201 +             let result = auth_service.change_password(&user.id, &new_password);
    |

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:263:69
    |
263 |             let result = auth_service.authenticate(email, password, "127.0.0.1");
    |                                       ------------                  ^^^^^^^^^^^ expected `Option<&str>`, found `&str`
    |                                       |
    |                                       arguments to this method are incorrect
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&'static str`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
263 |             let result = auth_service.authenticate(email, password, Some("127.0.0.1"));
    |                                                                     +++++           +

error[E0599]: no function or associated item named `create_test_user` found for struct `test_utils::TestDataFactory` in the current scope
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:278:49
    |
278 |         let mut user_request = TestDataFactory::create_test_user(None);
    |                                                 ^^^^^^^^^^^^^^^^ function or associated item not found in `test_utils::TestDataFactory`
    |
   ::: src-tauri\src\test_utils.rs:51:1
    |
 51 | pub struct TestDataFactory;
    | -------------------------- function or associated item `create_test_user` not found for this struct
    |
help: there is an associated function `create_test_step` with a similar name
   --> src-tauri\src\test_utils.rs:196:5
    |
196 | /     pub fn create_test_step(
197 | |         intervention_id: &str,
198 | |         step_number: i32,
199 | |         overrides: Option<InterventionStep>,
200 | |     ) -> InterventionStep {
    | |_________________________^

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:282:14
    |
282 |             .create_account(user_request, "127.0.0.1")
    |              ^^^^^^^^^^^^^^--------------------------- multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
...
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
282 |             .create_account(user_request, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */)
    |                                                      ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\auth_service_proptests.rs:293:25
    |
290 |                     auth.authenticate(
    |                          ------------ arguments to this method are incorrect
...
293 |                         &format!("127.0.0.{}", i + 1),
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<&str>`, found `&String`
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&std::string::String`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
293 |                         Some(&format!("127.0.0.{}", i + 1)),
    |                         +++++                             +

error[E0560]: struct `models::client::CreateClientRequest` has no field named `address`
  --> src-tauri\src\tests\proptests\client_validation_proptests.rs:21:13
   |
21 |             address: Some("Valid Address".to_string()),
   |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
   |
   = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `company`
  --> src-tauri\src\tests\proptests\client_validation_proptests.rs:22:13
   |
22 |             company: None,
   |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
   |
   = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `is_active`
  --> src-tauri\src\tests\proptests\client_validation_proptests.rs:24:13
   |
24 |             is_active: true,
   |             ^^^^^^^^^ `models::client::CreateClientRequest` does not have this field
   |
   = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `address`
  --> src-tauri\src\tests\proptests\client_validation_proptests.rs:53:13
   |
53 |             address: Some("Valid Address".to_string()),
   |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
   |
   = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `company`
  --> src-tauri\src\tests\proptests\client_validation_proptests.rs:54:13
   |
54 |             company: None,
   |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
   |
   = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `is_active`
  --> src-tauri\src\tests\proptests\client_validation_proptests.rs:56:13
   |
56 |             is_active: true,
   |             ^^^^^^^^^ `models::client::CreateClientRequest` does not have this field
   |
   = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `address`
  --> src-tauri\src\tests\proptests\client_validation_proptests.rs:84:17
   |
84 |                 address: Some("Valid Address".to_string()),
   |                 ^^^^^^^ `models::client::CreateClientRequest` does not have this field
   |
   = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `company`
  --> src-tauri\src\tests\proptests\client_validation_proptests.rs:85:17
   |
85 |                 company: None,
   |                 ^^^^^^^ `models::client::CreateClientRequest` does not have this field
   |
   = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `is_active`
  --> src-tauri\src\tests\proptests\client_validation_proptests.rs:87:17
   |
87 |                 is_active: true,
   |                 ^^^^^^^^^ `models::client::CreateClientRequest` does not have this field
   |
   = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `address`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:106:13
    |
106 |             address: Some(address.clone()),
    |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `company`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:107:13
    |
107 |             company: None,
    |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `is_active`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:109:13
    |
109 |             is_active: true,
    |             ^^^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `address`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:134:13
    |
134 |             address: None,
    |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `company`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:135:13
    |
135 |             company: None,
    |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `is_active`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:137:13
    |
137 |             is_active: true,
    |             ^^^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0277]: the trait bound `bool: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:11:1
    |
 11 | / proptest! {
 12 | |     #[test]
 13 | |     fn test_client_name_validation_properties(name in "\\PC*") {
 14 | |         let test_db = test_db!();
...   |
312 | | }
    | |_^ the trait `proptest::strategy::Strategy` is not implemented for `bool`
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others
    = note: required for `TupleUnion<((u32, std::sync::Arc<bool>), (u32, std::sync::Arc<bool>))>` to implement `proptest::strategy::Strategy`
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0560]: struct `models::client::CreateClientRequest` has no field named `address`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:167:13
    |
167 |             address: Some("Valid Address".to_string()),
    |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `company`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:168:13
    |
168 |             company: company.clone(),
    |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `is_active`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:170:13
    |
170 |             is_active,
    |             ^^^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0277]: the trait bound `std::string::String: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:11:1
    |
 11 | / proptest! {
 12 | |     #[test]
 13 | |     fn test_client_name_validation_properties(name in "\\PC*") {
 14 | |         let test_db = test_db!();
...   |
312 | | }
    | |_^ the trait `proptest::strategy::Strategy` is not implemented for `std::string::String`
    |
    = help: the trait `proptest::strategy::Strategy` is implemented for `str`
    = note: required for `TupleUnion<((u32, std::sync::Arc<&str>), (u32, std::sync::Arc<std::string::String>))>` to implement `proptest::strategy::Strategy`
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0277]: the trait bound `std::string::String: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:11:1
    |
 11 | / proptest! {
 12 | |     #[test]
 13 | |     fn test_client_name_validation_properties(name in "\\PC*") {
 14 | |         let test_db = test_db!();
...   |
312 | | }
    | |_^ the trait `proptest::strategy::Strategy` is not implemented for `std::string::String`
    |
    = help: the trait `proptest::strategy::Strategy` is implemented for `str`
    = note: required for `TupleUnion<((u32, std::sync::Arc<&str>), (u32, std::sync::Arc<std::string::String>))>` to implement `proptest::strategy::Strategy`
    = note: 1 redundant requirement hidden
    = note: required for `Map<(TupleUnion<((u32, Arc<&str>), (u32, Arc<String>))>, TupleUnion<((u32, ...), ..., ...)>, ...), ...>` to implement `proptest::strategy::Strategy`
    = note: the full name for the type has been written to 'D:\rpma-rust\src-tauri\target\debug\deps\rpma_ppf_intervention-c4da74d6cbf03e8a.long-type-8589238846668127495.txt'
    = note: consider using `--verbose` to print the full type name to the console
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0560]: struct `models::client::CreateClientRequest` has no field named `address`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:198:13
    |
198 |             address: Some("Valid Address".to_string()),
    |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `company`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:199:13
    |
199 |             company: None,
    |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `is_active`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:201:13
    |
201 |             is_active: true,
    |             ^^^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `address`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:242:13
    |
242 |             address: Some("Address One".to_string()),
    |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `company`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:243:13
    |
243 |             company: None,
    |             ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `is_active`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:245:13
    |
245 |             is_active: true,
    |             ^^^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `address`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:261:17
    |
261 |                 address: Some(format!("Address {}", i + 1)),
    |                 ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `company`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:262:17
    |
262 |                 company: None,
    |                 ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `is_active`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:264:17
    |
264 |                 is_active: true,
    |                 ^^^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `address`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:298:17
    |
298 |                 address: Some("Valid Address".to_string()),
    |                 ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `company`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:299:17
    |
299 |                 company: None,
    |                 ^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `models::client::CreateClientRequest` has no field named `is_active`
   --> src-tauri\src\tests\proptests\client_validation_proptests.rs:301:17
    |
301 |                 is_active: true,
    |                 ^^^^^^^^^ `models::client::CreateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0308]: mismatched types
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:18:20
   |
18 |             title: title.clone(),
   |                    ^^^^^^^^^^^^^ expected `Option<String>`, found `String`
   |
   = note: expected enum `std::option::Option<std::string::String>`
            found struct `std::string::String`
help: try wrapping the expression in `Some`
   |
18 |             title: Some(title.clone()),
   |                    +++++             +

error[E0308]: mismatched types
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:20:28
   |
20 |             vehicle_plate: Some("ABC123".to_string()),
   |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `Option<String>`
   |
   = note: expected struct `std::string::String`
                found enum `std::option::Option<std::string::String>`

error[E0308]: mismatched types
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:21:21
   |
21 |             status: "draft".to_string(),
   |                     ^^^^^^^^^^^^^^^^^^^ expected `Option<TaskStatus>`, found `String`
   |
   = note: expected enum `std::option::Option<models::task::TaskStatus>`
            found struct `std::string::String`

error[E0308]: mismatched types
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:22:23
   |
22 |             priority: "medium".to_string(),
   |                       ^^^^^^^^^^^^^^^^^^^^ expected `Option<TaskPriority>`, found `String`
   |
   = note: expected enum `std::option::Option<models::task::TaskPriority>`
            found struct `std::string::String`

error[E0308]: mismatched types
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:24:29
   |
24 |             scheduled_date: None,
   |                             ^^^^ expected `String`, found `Option<_>`
   |
   = note: expected struct `std::string::String`
                found enum `std::option::Option<_>`

error[E0308]: mismatched types
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:36:24
   |
36 |             ppf_zones: None,
   |                        ^^^^ expected `Vec<String>`, found `Option<_>`
   |
   = note: expected struct `Vec<std::string::String>`
                found enum `std::option::Option<_>`

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_at`
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:38:13
   |
38 |             assigned_at: None,
   |             ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
   |
   = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_by`
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:39:13
   |
39 |             assigned_by: None,
   |             ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
   |
   = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `actual_duration`
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:44:13
   |
44 |             actual_duration: None,
   |             ^^^^^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
   |
   = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:47:30
    |
 47 |         let result = service.validate_create_task_request(&task_request).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0308]: mismatched types
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:67:20
   |
67 |             title: "Valid Task Title".to_string(),
   |                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
   |
   = note: expected enum `std::option::Option<std::string::String>`
            found struct `std::string::String`
help: try wrapping the expression in `Some`
   |
67 |             title: Some("Valid Task Title".to_string()),
   |                    +++++                              +

error[E0308]: mismatched types
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:69:28
   |
69 |             vehicle_plate: Some(plate.clone()),
   |                            ^^^^^^^^^^^^^^^^^^^ expected `String`, found `Option<String>`
   |
   = note: expected struct `std::string::String`
                found enum `std::option::Option<std::string::String>`

error[E0308]: mismatched types
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:70:21
   |
70 |             status: "draft".to_string(),
   |                     ^^^^^^^^^^^^^^^^^^^ expected `Option<TaskStatus>`, found `String`
   |
   = note: expected enum `std::option::Option<models::task::TaskStatus>`
            found struct `std::string::String`

error[E0308]: mismatched types
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:71:23
   |
71 |             priority: "medium".to_string(),
   |                       ^^^^^^^^^^^^^^^^^^^^ expected `Option<TaskPriority>`, found `String`
   |
   = note: expected enum `std::option::Option<models::task::TaskPriority>`
            found struct `std::string::String`

error[E0308]: mismatched types
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:73:29
   |
73 |             scheduled_date: None,
   |                             ^^^^ expected `String`, found `Option<_>`
   |
   = note: expected struct `std::string::String`
                found enum `std::option::Option<_>`

error[E0308]: mismatched types
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:85:24
   |
85 |             ppf_zones: None,
   |                        ^^^^ expected `Vec<String>`, found `Option<_>`
   |
   = note: expected struct `Vec<std::string::String>`
                found enum `std::option::Option<_>`

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_at`
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:87:13
   |
87 |             assigned_at: None,
   |             ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
   |
   = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_by`
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:88:13
   |
88 |             assigned_by: None,
   |             ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
   |
   = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `actual_duration`
  --> src-tauri\src\tests\proptests\task_validation_proptests.rs:93:13
   |
93 |             actual_duration: None,
   |             ^^^^^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
   |
   = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:96:30
    |
 96 |         let result = service.validate_create_task_request(&task_request).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:120:20
    |
120 |             title: "Valid Task Title".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
120 |             title: Some("Valid Task Title".to_string()),
    |                    +++++                              +

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:122:28
    |
122 |             vehicle_plate: Some("ABC123".to_string()),
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `Option<String>`
    |
    = note: expected struct `std::string::String`
                 found enum `std::option::Option<std::string::String>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:123:21
    |
123 |             status: "draft".to_string(),
    |                     ^^^^^^^^^^^^^^^^^^^ expected `Option<TaskStatus>`, found `String`
    |
    = note: expected enum `std::option::Option<models::task::TaskStatus>`
             found struct `std::string::String`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:124:23
    |
124 |             priority: "medium".to_string(),
    |                       ^^^^^^^^^^^^^^^^^^^^ expected `Option<TaskPriority>`, found `String`
    |
    = note: expected enum `std::option::Option<models::task::TaskPriority>`
             found struct `std::string::String`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:126:29
    |
126 |             scheduled_date: None,
    |                             ^^^^ expected `String`, found `Option<_>`
    |
    = note: expected struct `std::string::String`
                 found enum `std::option::Option<_>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:138:24
    |
138 |             ppf_zones: None,
    |                        ^^^^ expected `Vec<String>`, found `Option<_>`
    |
    = note: expected struct `Vec<std::string::String>`
                 found enum `std::option::Option<_>`

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_at`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:140:13
    |
140 |             assigned_at: None,
    |             ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_by`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:141:13
    |
141 |             assigned_by: None,
    |             ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `actual_duration`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:146:13
    |
146 |             actual_duration: None,
    |             ^^^^^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:149:30
    |
149 |         let result = service.validate_create_task_request(&task_request).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:161:20
    |
161 |             title: "Valid Task Title".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
161 |             title: Some("Valid Task Title".to_string()),
    |                    +++++                              +

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:163:28
    |
163 |             vehicle_plate: Some("ABC123".to_string()),
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `Option<String>`
    |
    = note: expected struct `std::string::String`
                 found enum `std::option::Option<std::string::String>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:164:21
    |
164 |             status: "draft".to_string(),
    |                     ^^^^^^^^^^^^^^^^^^^ expected `Option<TaskStatus>`, found `String`
    |
    = note: expected enum `std::option::Option<models::task::TaskStatus>`
             found struct `std::string::String`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:165:23
    |
165 |             priority: "medium".to_string(),
    |                       ^^^^^^^^^^^^^^^^^^^^ expected `Option<TaskPriority>`, found `String`
    |
    = note: expected enum `std::option::Option<models::task::TaskPriority>`
             found struct `std::string::String`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:167:29
    |
167 |             scheduled_date: None,
    |                             ^^^^ expected `String`, found `Option<_>`
    |
    = note: expected struct `std::string::String`
                 found enum `std::option::Option<_>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:179:24
    |
179 |             ppf_zones: None,
    |                        ^^^^ expected `Vec<String>`, found `Option<_>`
    |
    = note: expected struct `Vec<std::string::String>`
                 found enum `std::option::Option<_>`

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_at`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:181:13
    |
181 |             assigned_at: None,
    |             ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_by`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:182:13
    |
182 |             assigned_by: None,
    |             ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `actual_duration`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:187:13
    |
187 |             actual_duration: None,
    |             ^^^^^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:190:30
    |
190 |         let result = service.validate_create_task_request(&task_request).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:219:24
    |
219 |                 title: "Valid Task Title".to_string(),
    |                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
219 |                 title: Some("Valid Task Title".to_string()),
    |                        +++++                              +

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:221:32
    |
221 |                 vehicle_plate: Some("ABC123".to_string()),
    |                                ^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `Option<String>`
    |
    = note: expected struct `std::string::String`
                 found enum `std::option::Option<std::string::String>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:222:25
    |
222 |                 status: "draft".to_string(),
    |                         ^^^^^^^^^^^^^^^^^^^ expected `Option<TaskStatus>`, found `String`
    |
    = note: expected enum `std::option::Option<models::task::TaskStatus>`
             found struct `std::string::String`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:223:27
    |
223 |                 priority: "medium".to_string(),
    |                           ^^^^^^^^^^^^^^^^^^^^ expected `Option<TaskPriority>`, found `String`
    |
    = note: expected enum `std::option::Option<models::task::TaskPriority>`
             found struct `std::string::String`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:225:33
    |
225 |                 scheduled_date: None,
    |                                 ^^^^ expected `String`, found `Option<_>`
    |
    = note: expected struct `std::string::String`
                 found enum `std::option::Option<_>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:237:28
    |
237 |                 ppf_zones: None,
    |                            ^^^^ expected `Vec<String>`, found `Option<_>`
    |
    = note: expected struct `Vec<std::string::String>`
                 found enum `std::option::Option<_>`

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_at`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:239:17
    |
239 |                 assigned_at: None,
    |                 ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_by`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:240:17
    |
240 |                 assigned_by: None,
    |                 ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `actual_duration`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:245:17
    |
245 |                 actual_duration: None,
    |                 ^^^^^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:248:34
    |
248 |             let result = service.validate_create_task_request(&task_request).unwrap();
    |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0599]: no method named `validate_status_transition` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:263:30
    |
263 |         let result = service.validate_status_transition(from_status, to_status).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_status_transition` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:300:41
    |
300 |         if valid_transitions.contains(&(from_status, to_status)) {
    |                                         ^^^^^^^^^^^ expected `&str`, found `String`
    |
help: consider borrowing here
    |
300 |         if valid_transitions.contains(&(&from_status, to_status)) {
    |                                         +

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:300:54
    |
300 |         if valid_transitions.contains(&(from_status, to_status)) {
    |                                                      ^^^^^^^^^ expected `&str`, found `String`
    |
help: consider borrowing here
    |
300 |         if valid_transitions.contains(&(from_status, &to_status)) {
    |                                                      +

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:318:20
    |
318 |             title: title.clone(),
    |                    ^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
318 |             title: Some(title.clone()),
    |                    +++++             +

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:320:28
    |
320 |             vehicle_plate: Some("ABC123".to_string()),
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `Option<String>`
    |
    = note: expected struct `std::string::String`
                 found enum `std::option::Option<std::string::String>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:321:21
    |
321 |             status: "draft".to_string(),
    |                     ^^^^^^^^^^^^^^^^^^^ expected `Option<TaskStatus>`, found `String`
    |
    = note: expected enum `std::option::Option<models::task::TaskStatus>`
             found struct `std::string::String`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:322:23
    |
322 |             priority: priority.to_string(),
    |                       ^^^^^^^^^^^^^^^^^^^^ expected `Option<TaskPriority>`, found `String`
    |
    = note: expected enum `std::option::Option<models::task::TaskPriority>`
             found struct `std::string::String`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:324:29
    |
324 |             scheduled_date: None,
    |                             ^^^^ expected `String`, found `Option<_>`
    |
    = note: expected struct `std::string::String`
                 found enum `std::option::Option<_>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:336:24
    |
336 |             ppf_zones: None,
    |                        ^^^^ expected `Vec<String>`, found `Option<_>`
    |
    = note: expected struct `Vec<std::string::String>`
                 found enum `std::option::Option<_>`

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_at`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:338:13
    |
338 |             assigned_at: None,
    |             ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_by`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:339:13
    |
339 |             assigned_by: None,
    |             ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `actual_duration`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:344:13
    |
344 |             actual_duration: None,
    |             ^^^^^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:347:30
    |
347 |         let result = service.validate_create_task_request(&task_request).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0277]: the trait bound `std::string::String: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:11:1
    |
 11 | / proptest! {
 12 | |     #[test]
 13 | |     fn test_task_title_validation_properties(title in "\\PC*") {
 14 | |         let test_db = test_db!();
...   |
418 | | }
    | |_^ the trait `proptest::strategy::Strategy` is not implemented for `std::string::String`
    |
    = help: the trait `proptest::strategy::Strategy` is implemented for `str`
    = note: required for `TupleUnion<((u32, std::sync::Arc<&str>), (u32, std::sync::Arc<std::string::String>))>` to implement `proptest::strategy::Strategy`
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0277]: the trait bound `{integer}: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:11:1
    |
 11 | / proptest! {
 12 | |     #[test]
 13 | |     fn test_task_title_validation_properties(title in "\\PC*") {
 14 | |         let test_db = test_db!();
...   |
418 | | }
    | |_^ the trait `proptest::strategy::Strategy` is not implemented for `{integer}`
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others
    = note: required for `TupleUnion<((u32, std::sync::Arc<{integer}>), (u32, std::sync::Arc<{integer}>), (u32, std::sync::Arc<{integer}>))>` to implement `proptest::strategy::Strategy`
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0277]: the trait bound `std::string::String: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:11:1
    |
 11 | / proptest! {
 12 | |     #[test]
 13 | |     fn test_task_title_validation_properties(title in "\\PC*") {
 14 | |         let test_db = test_db!();
...   |
418 | | }
    | |_^ the trait `proptest::strategy::Strategy` is not implemented for `std::string::String`
    |
    = help: the trait `proptest::strategy::Strategy` is implemented for `str`
    = note: required for `TupleUnion<((u32, std::sync::Arc<&str>), (u32, std::sync::Arc<std::string::String>))>` to implement `proptest::strategy::Strategy`
    = note: 1 redundant requirement hidden
    = note: required for `Map<(TupleUnion<((u32, Arc<&str>), (u32, Arc<String>))>, TupleUnion<((u32, ...), ..., ...)>, ...), ...>` to implement `proptest::strategy::Strategy`
    = note: the full name for the type has been written to 'D:\rpma-rust\src-tauri\target\debug\deps\rpma_ppf_intervention-c4da74d6cbf03e8a.long-type-1874779558971487200.txt'
    = note: consider using `--verbose` to print the full type name to the console
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:368:20
    |
368 |             title: title_errors.clone(),
    |                    ^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
368 |             title: Some(title_errors.clone()),
    |                    +++++                    +

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:370:28
    |
370 |             vehicle_plate: Some("ABC123".to_string()),
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `Option<String>`
    |
    = note: expected struct `std::string::String`
                 found enum `std::option::Option<std::string::String>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:371:21
    |
371 |             status: "draft".to_string(),
    |                     ^^^^^^^^^^^^^^^^^^^ expected `Option<TaskStatus>`, found `String`
    |
    = note: expected enum `std::option::Option<models::task::TaskStatus>`
             found struct `std::string::String`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:372:23
    |
372 |             priority: "medium".to_string(),
    |                       ^^^^^^^^^^^^^^^^^^^^ expected `Option<TaskPriority>`, found `String`
    |
    = note: expected enum `std::option::Option<models::task::TaskPriority>`
             found struct `std::string::String`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:374:29
    |
374 |             scheduled_date: None,
    |                             ^^^^ expected `String`, found `Option<_>`
    |
    = note: expected struct `std::string::String`
                 found enum `std::option::Option<_>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:386:24
    |
386 |             ppf_zones: None,
    |                        ^^^^ expected `Vec<String>`, found `Option<_>`
    |
    = note: expected struct `Vec<std::string::String>`
                 found enum `std::option::Option<_>`

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_at`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:388:13
    |
388 |             assigned_at: None,
    |             ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `assigned_by`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:389:13
    |
389 |             assigned_by: None,
    |             ^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0560]: struct `models::task::CreateTaskRequest` has no field named `actual_duration`
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:394:13
    |
394 |             actual_duration: None,
    |             ^^^^^^^^^^^^^^^ `models::task::CreateTaskRequest` does not have this field
    |
    = note: available fields are: `vehicle_model`, `external_id`, `checklist_completed`, `vehicle_make`, `vehicle_year` ... and 4 others

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_proptests.rs:397:30
    |
397 |         let result = service.validate_create_task_request(&task_request).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0277]: the trait bound `models::task::TaskStatus: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:21:5
    |
 21 | /     proptest! {
 22 | |         #![proptest_config(ProptestConfig::with_cases(200))]
 23 | |
 24 | |         #[test]
...   |
217 | |     }
    | |_____^ the trait `proptest::strategy::Strategy` is not implemented for `models::task::TaskStatus`
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others
    = note: required for `TupleUnion<((u32, Arc<TaskStatus>), (u32, Arc<TaskStatus>), (u32, Arc<TaskStatus>), ..., ..., ...)>` to implement `proptest::strategy::Strategy`
    = note: the full name for the type has been written to 'D:\rpma-rust\src-tauri\target\debug\deps\rpma_ppf_intervention-c4da74d6cbf03e8a.long-type-3589425610320198309.txt'
    = note: consider using `--verbose` to print the full type name to the console
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0599]: no method named `validate_status_transition` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:46:45
    |
 46 |             let result = validation_service.validate_status_transition(&task, to_status);
    |                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_status_transition` not found for this struct

error[E0599]: no method named `validate_ppf_zones` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:92:45
    |
 92 |             let result = validation_service.validate_ppf_zones(&task);
    |                                             ^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_ppf_zones` not found for this struct

error[E0277]: the trait bound `models::task::TaskPriority: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:21:5
    |
 21 | /     proptest! {
 22 | |         #![proptest_config(ProptestConfig::with_cases(200))]
 23 | |
 24 | |         #[test]
...   |
217 | |     }
    | |_____^ the trait `proptest::strategy::Strategy` is not implemented for `models::task::TaskPriority`
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others
    = note: required for `TupleUnion<((u32, Arc<TaskPriority>), (u32, Arc<TaskPriority>), (u32, Arc<TaskPriority>), (u32, ...))>` to implement `proptest::strategy::Strategy`
    = note: the full name for the type has been written to 'D:\rpma-rust\src-tauri\target\debug\deps\rpma_ppf_intervention-c4da74d6cbf03e8a.long-type-13669455775927056810.txt'
    = note: consider using `--verbose` to print the full type name to the console
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0599]: no method named `validate_task_comprehensive` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:119:45
    |
119 |             let result = validation_service.validate_task_comprehensive(&task);
    |                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_task_comprehensive` not found for this struct

error[E0277]: the trait bound `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:125:22
    |
 21 | /     proptest! {
 22 | |         #![proptest_config(ProptestConfig::with_cases(200))]
 23 | |
 24 | |         #[test]
...   |
125 | |             plate in prop::string::string_regex(r"[A-Z0-9]{1,10}")
    | |                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ the trait `proptest::strategy::Strategy` is not implemented for `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::
Error>`
...   |
217 | |     }
    | |_____- required by a bound introduced by this call
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others

error[E0277]: the trait bound `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:21:5
    |
 21 | /     proptest! {
 22 | |         #![proptest_config(ProptestConfig::with_cases(200))]
 23 | |
 24 | |         #[test]
...   |
217 | |     }
    | |_____^ the trait `proptest::strategy::Strategy` is not implemented for `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>`
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others
    = note: required for `Map<Result<RegexGeneratorStrategy<String>, Error>, {closure@sugar.rs:972:17}>` to implement `proptest::strategy::Strategy`
    = note: the full name for the type has been written to 'D:\rpma-rust\src-tauri\target\debug\deps\rpma_ppf_intervention-c4da74d6cbf03e8a.long-type-3858013358976612232.txt'
    = note: consider using `--verbose` to print the full type name to the console
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0599]: no method named `validate_task_comprehensive` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:132:49
    |
132 |                 let result = validation_service.validate_task_comprehensive(&task);
    |                                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_task_comprehensive` not found for this struct

error[E0599]: no method named `validate_task_comprehensive` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:137:49
    |
137 |                 let result = validation_service.validate_task_comprehensive(&task);
    |                                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_task_comprehensive` not found for this struct

error[E0599]: no method named `validate_task_comprehensive` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:150:45
    |
150 |             let result = validation_service.validate_task_comprehensive(&task);
    |                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_task_comprehensive` not found for this struct

error[E0277]: the trait bound `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>: proptest::strategy::Strategy` is not satisfied
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:21:5
    |
 21 | /     proptest! {
 22 | |         #![proptest_config(ProptestConfig::with_cases(200))]
 23 | |
 24 | |         #[test]
...   |
217 | |     }
    | |_____^ the trait `proptest::strategy::Strategy` is not implemented for `Result<RegexGeneratorStrategy<std::string::String>, proptest::string::Error>`
    |
    = help: the following other types implement trait `proptest::strategy::Strategy`:
              &'a S
              &'a mut S
              (A, B)
              (A, B, C)
              (A, B, C, D)
              (A, B, C, D, E)
              (A, B, C, D, E, F)
              (A, B, C, D, E, F, G)
            and 148 others
    = note: required for `(Result<RegexGeneratorStrategy<String>, Error>, Result<RegexGeneratorStrategy<String>, Error>, ...)` to implement `proptest::strategy::Strategy`
    = note: the full name for the type has been written to 'D:\rpma-rust\src-tauri\target\debug\deps\rpma_ppf_intervention-c4da74d6cbf03e8a.long-type-2765230715640272382.txt'
    = note: consider using `--verbose` to print the full type name to the console
    = note: this error originates in the macro `$crate::proptest_helper` which comes from the expansion of the macro `proptest` (in Nightly builds, run with -Z macro-backtrace for more info)

error[E0599]: no method named `validate_task_comprehensive` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:174:45
    |
174 |             let result = validation_service.validate_task_comprehensive(&task);
    |                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_task_comprehensive` not found for this struct

error[E0599]: no method named `validate_task_comprehensive` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:195:45
    |
195 |             let result = validation_service.validate_task_comprehensive(&task);
    |                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_task_comprehensive` not found for this struct

error[E0599]: no method named `validate_task_comprehensive` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:212:45
    |
212 |             let result = validation_service.validate_task_comprehensive(&task);
    |                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_task_comprehensive` not found for this struct

error[E0599]: no method named `validate_task_comprehensive` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:250:45
    |
250 |             let result = validation_service.validate_task_comprehensive(&task);
    |                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_task_comprehensive` not found for this struct

error[E0616]: field `db` of struct `task_validation::TaskValidationService` is private
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:276:18
    |
276 |                 .db
    |                  ^^ private field

error[E0624]: method `check_workload_capacity` is private
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:316:45
    |
316 |               let result = validation_service.check_workload_capacity(&technician_id);
    |                                               ^^^^^^^^^^^^^^^^^^^^^^^ private method
    |
   ::: src-tauri\src\services\task_validation.rs:466:5
    |
466 | /     fn check_workload_capacity(
467 | |         &self,
468 | |         user_id: &str,
469 | |         scheduled_date: &Option<String>,
470 | |     ) -> Result<bool, String> {
    | |_____________________________- private method defined here

error[E0599]: no method named `validate_task_comprehensive` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\proptests\task_validation_service_proptests.rs:360:45
    |
360 |             let result = validation_service.validate_task_comprehensive(&task);
    |                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_task_comprehensive` not found for this struct

error[E0599]: no variant or associated item named `new` found for enum `FileFailurePersistence` in the current scope
  --> src-tauri\src\tests\proptests\mod.rs:26:64
   |
26 |                 proptest::test_runner::FileFailurePersistence::new("proptest-regressions"),
   |                                                                ^^^ variant or associated item not found in `FileFailurePersistence`
   |
   = help: items from traits can only be used if the trait is in scope
help: trait `Paint` which provides `new` is implemented but not in scope; perhaps you want to import it
   |
17 +     use yansi::Paint;
   |
help: there is a method `ne` with a similar name
   |
26 -                 proptest::test_runner::FileFailurePersistence::new("proptest-regressions"),
26 +                 proptest::test_runner::FileFailurePersistence::ne("proptest-regressions"),
   |

error[E0560]: struct `commands::auth::SignupRequest` has no field named `phone`
  --> src-tauri\src\tests\unit\auth_service_tests.rs:44:13
   |
44 |             phone: Some("555-1234".to_string()),
   |             ^^^^^ `commands::auth::SignupRequest` does not have this field
   |
   = note: available fields are: `correlation_id`

error[E0308]: mismatched types
  --> src-tauri\src\tests\unit\auth_service_tests.rs:46:19
   |
46 |             role: UserRole::Technician,
   |                   ^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `UserRole`
   |
   = note: expected enum `std::option::Option<std::string::String>`
              found enum `models::auth::UserRole`

error[E0560]: struct `commands::auth::SignupRequest` has no field named `two_factor_enabled`
  --> src-tauri\src\tests\unit\auth_service_tests.rs:47:13
   |
47 |             two_factor_enabled: false,
   |             ^^^^^^^^^^^^^^^^^^ `commands::auth::SignupRequest` does not have this field
   |
   = note: available fields are: `correlation_id`

error[E0560]: struct `commands::auth::SignupRequest` has no field named `avatar_url`
  --> src-tauri\src\tests\unit\auth_service_tests.rs:48:13
   |
48 |             avatar_url: None,
   |             ^^^^^^^^^^ `commands::auth::SignupRequest` does not have this field
   |
   = note: available fields are: `correlation_id`

error[E0560]: struct `commands::auth::SignupRequest` has no field named `address_street`
  --> src-tauri\src\tests\unit\auth_service_tests.rs:49:13
   |
49 |             address_street: Some("123 Test St".to_string()),
   |             ^^^^^^^^^^^^^^ `commands::auth::SignupRequest` does not have this field
   |
   = note: available fields are: `correlation_id`

error[E0560]: struct `commands::auth::SignupRequest` has no field named `address_city`
  --> src-tauri\src\tests\unit\auth_service_tests.rs:50:13
   |
50 |             address_city: Some("Test City".to_string()),
   |             ^^^^^^^^^^^^ `commands::auth::SignupRequest` does not have this field
   |
   = note: available fields are: `correlation_id`

error[E0560]: struct `commands::auth::SignupRequest` has no field named `address_state`
  --> src-tauri\src\tests\unit\auth_service_tests.rs:51:13
   |
51 |             address_state: Some("Test State".to_string()),
   |             ^^^^^^^^^^^^^ `commands::auth::SignupRequest` does not have this field
   |
   = note: available fields are: `correlation_id`

error[E0560]: struct `commands::auth::SignupRequest` has no field named `address_zip`
  --> src-tauri\src\tests\unit\auth_service_tests.rs:52:13
   |
52 |             address_zip: Some("12345".to_string()),
   |             ^^^^^^^^^^^ `commands::auth::SignupRequest` does not have this field
   |
   = note: available fields are: `correlation_id`

error[E0560]: struct `commands::auth::SignupRequest` has no field named `address_country`
  --> src-tauri\src\tests\unit\auth_service_tests.rs:53:13
   |
53 |             address_country: Some("Test Country".to_string()),
   |             ^^^^^^^^^^^^^^^ `commands::auth::SignupRequest` does not have this field
   |
   = note: available fields are: `correlation_id`

error[E0560]: struct `commands::auth::SignupRequest` has no field named `tax_id`
  --> src-tauri\src\tests\unit\auth_service_tests.rs:54:13
   |
54 |             tax_id: None,
   |             ^^^^^^ `commands::auth::SignupRequest` does not have this field
   |
   = note: available fields are: `correlation_id`

error[E0560]: struct `commands::auth::SignupRequest` has no field named `company_name`
  --> src-tauri\src\tests\unit\auth_service_tests.rs:55:13
   |
55 |             company_name: None,
   |             ^^^^^^^^^^^^ `commands::auth::SignupRequest` does not have this field
   |
   = note: available fields are: `correlation_id`

error[E0560]: struct `commands::auth::SignupRequest` has no field named `contact_person`
  --> src-tauri\src\tests\unit\auth_service_tests.rs:56:13
   |
56 |             contact_person: None,
   |             ^^^^^^^^^^^^^^ `commands::auth::SignupRequest` does not have this field
   |
   = note: available fields are: `correlation_id`

error[E0560]: struct `commands::auth::SignupRequest` has no field named `notes`
  --> src-tauri\src\tests\unit\auth_service_tests.rs:57:13
   |
57 |             notes: None,
   |             ^^^^^ `commands::auth::SignupRequest` does not have this field
   |
   = note: available fields are: `correlation_id`

error[E0560]: struct `commands::auth::SignupRequest` has no field named `tags`
  --> src-tauri\src\tests\unit\auth_service_tests.rs:58:13
   |
58 |             tags: None,
   |             ^^^^ `commands::auth::SignupRequest` does not have this field
   |
   = note: available fields are: `correlation_id`

error[E0616]: field `db` of struct `services::auth::AuthService` is private
   --> src-tauri\src\tests\unit\auth_service_tests.rs:126:14
    |
126 |             .db
    |              ^^ private field

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:163:14
    |
163 |             .create_account(user_request, "127.0.0.1")
    |              ^^^^^^^^^^^^^^---------------------------
    |                            ||
    |                            |expected `&str`, found `SignupRequest`
    |                            multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
193 |         &self,
194 |         email: &str,
    |         -----------
195 |         username: &str,
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
163 -             .create_account(user_request, "127.0.0.1")
163 +             .create_account(/* &str */, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */)
    |

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\auth_service_tests.rs:168:82
    |
168 |             auth_service.authenticate("alice@example.com", "SecurePassword123!", "127.0.0.1");
    |                          ------------ arguments to this method are incorrect     ^^^^^^^^^^^ expected `Option<&str>`, found `&str`
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&'static str`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
168 |             auth_service.authenticate("alice@example.com", "SecurePassword123!", Some("127.0.0.1"));
    |                                                                                  +++++           +

error[E0277]: can't compare `std::string::String` with `chrono::DateTime<chrono::Utc>`
   --> src-tauri\src\tests\unit\auth_service_tests.rs:177:36
    |
177 |         assert!(session.expires_at > Utc::now());
    |                                    ^ no implementation for `std::string::String < chrono::DateTime<chrono::Utc>` and `std::string::String > chrono::DateTime<chrono::Utc>`
    |
    = help: the trait `PartialOrd<chrono::DateTime<chrono::Utc>>` is not implemented for `std::string::String`
    = help: the following other types implement trait `PartialOrd<Rhs>`:
              `std::string::String` implements `PartialOrd<&bstr::bstr::BStr>`
              `std::string::String` implements `PartialOrd<&camino::Utf8Path>`
              `std::string::String` implements `PartialOrd<Authority>`
              `std::string::String` implements `PartialOrd<HeaderValue>`
              `std::string::String` implements `PartialOrd<PathAndQuery>`
              `std::string::String` implements `PartialOrd<bstr::bstr::BStr>`
              `std::string::String` implements `PartialOrd<bstr::bstring::BString>`
              `std::string::String` implements `PartialOrd<bytes::bytes_mut::BytesMut>`
            and 16 others

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:189:14
    |
189 |             .create_account(user_request, "127.0.0.1")
    |              ^^^^^^^^^^^^^^---------------------------
    |                            ||
    |                            |expected `&str`, found `SignupRequest`
    |                            multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
193 |         &self,
194 |         email: &str,
    |         -----------
195 |         username: &str,
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
189 -             .create_account(user_request, "127.0.0.1")
189 +             .create_account(/* &str */, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */)
    |

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\auth_service_tests.rs:193:85
    |
193 |         let result = auth_service.authenticate("bob@example.com", "WrongPassword!", "127.0.0.1");
    |                                   ------------                                      ^^^^^^^^^^^ expected `Option<&str>`, found `&str`
    |                                   |
    |                                   arguments to this method are incorrect
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&'static str`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
193 |         let result = auth_service.authenticate("bob@example.com", "WrongPassword!", Some("127.0.0.1"));
    |                                                                                     +++++           +

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\auth_service_tests.rs:209:83
    |
209 |             auth_service.authenticate("nonexistent@example.com", "SomePassword!", "127.0.0.1");
    |                          ------------ arguments to this method are incorrect      ^^^^^^^^^^^ expected `Option<&str>`, found `&str`
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&'static str`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
209 |             auth_service.authenticate("nonexistent@example.com", "SomePassword!", Some("127.0.0.1"));
    |                                                                                   +++++           +

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:228:14
    |
228 |             .create_account(user_request, "127.0.0.1")
    |              ^^^^^^^^^^^^^^---------------------------
    |                            ||
    |                            |expected `&str`, found `SignupRequest`
    |                            multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
193 |         &self,
194 |         email: &str,
    |         -----------
195 |         username: &str,
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
228 -             .create_account(user_request, "127.0.0.1")
228 +             .create_account(/* &str */, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */)
    |

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\auth_service_tests.rs:234:86
    |
234 |                 auth_service.authenticate("ratelimit@example.com", "WrongPassword!", "127.0.0.1");
    |                              ------------ arguments to this method are incorrect     ^^^^^^^^^^^ expected `Option<&str>`, found `&str`
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&'static str`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
234 |                 auth_service.authenticate("ratelimit@example.com", "WrongPassword!", Some("127.0.0.1"));
    |                                                                                      +++++           +

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\auth_service_tests.rs:239:86
    |
239 |             auth_service.authenticate("ratelimit@example.com", "SecurePassword123!", "127.0.0.1");
    |                          ------------ arguments to this method are incorrect         ^^^^^^^^^^^ expected `Option<&str>`, found `&str`
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&'static str`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
239 |             auth_service.authenticate("ratelimit@example.com", "SecurePassword123!", Some("127.0.0.1"));
    |                                                                                      +++++           +

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:256:35
    |
256 |         let result = auth_service.create_account(invalid_user, "127.0.0.1");
    |                                   ^^^^^^^^^^^^^^---------------------------
    |                                                 ||
    |                                                 |expected `&str`, found `SignupRequest`
    |                                                 multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
193 |         &self,
194 |         email: &str,
    |         -----------
195 |         username: &str,
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
256 -         let result = auth_service.create_account(invalid_user, "127.0.0.1");
256 +         let result = auth_service.create_account(/* &str */, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */);
    |

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:264:35
    |
264 |         let result = auth_service.create_account(weak_password_user, "127.0.0.1");
    |                                   ^^^^^^^^^^^^^^---------------------------------
    |                                                 ||
    |                                                 |expected `&str`, found `SignupRequest`
    |                                                 multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
193 |         &self,
194 |         email: &str,
    |         -----------
195 |         username: &str,
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
264 -         let result = auth_service.create_account(weak_password_user, "127.0.0.1");
264 +         let result = auth_service.create_account(/* &str */, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */);
    |

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:274:14
    |
274 |             .create_account(valid_user, "127.0.0.1")
    |              ^^^^^^^^^^^^^^-------------------------
    |                            ||
    |                            |expected `&str`, found `SignupRequest`
    |                            multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
193 |         &self,
194 |         email: &str,
    |         -----------
195 |         username: &str,
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
274 -             .create_account(valid_user, "127.0.0.1")
274 +             .create_account(/* &str */, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */)
    |

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:278:35
    |
278 |         let result = auth_service.create_account(valid_user2, "127.0.0.1");
    |                                   ^^^^^^^^^^^^^^--------------------------
    |                                                 ||
    |                                                 |expected `&str`, found `SignupRequest`
    |                                                 multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
193 |         &self,
194 |         email: &str,
    |         -----------
195 |         username: &str,
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
278 -         let result = auth_service.create_account(valid_user2, "127.0.0.1");
278 +         let result = auth_service.create_account(/* &str */, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */);
    |

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:291:14
    |
291 |             .create_account(user_request, "127.0.0.1")
    |              ^^^^^^^^^^^^^^---------------------------
    |                            ||
    |                            |expected `&str`, found `SignupRequest`
    |                            multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
193 |         &self,
194 |         email: &str,
    |         -----------
195 |         username: &str,
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
291 -             .create_account(user_request, "127.0.0.1")
291 +             .create_account(/* &str */, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */)
    |

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\auth_service_tests.rs:295:72
    |
295 |             .authenticate("session@example.com", "SecurePassword123!", "127.0.0.1")
    |              ------------ arguments to this method are incorrect       ^^^^^^^^^^^ expected `Option<&str>`, found `&str`
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&'static str`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
295 |             .authenticate("session@example.com", "SecurePassword123!", Some("127.0.0.1"))
    |                                                                        +++++           +

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:324:14
    |
324 |             .create_account(user_request, "127.0.0.1")
    |              ^^^^^^^^^^^^^^---------------------------
    |                            ||
    |                            |expected `&str`, found `SignupRequest`
    |                            multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
193 |         &self,
194 |         email: &str,
    |         -----------
195 |         username: &str,
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
324 -             .create_account(user_request, "127.0.0.1")
324 +             .create_account(/* &str */, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */)
    |

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\auth_service_tests.rs:328:71
    |
328 |             .authenticate("logout@example.com", "SecurePassword123!", "127.0.0.1")
    |              ------------ arguments to this method are incorrect      ^^^^^^^^^^^ expected `Option<&str>`, found `&str`
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&'static str`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
328 |             .authenticate("logout@example.com", "SecurePassword123!", Some("127.0.0.1"))
    |                                                                       +++++           +

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:349:14
    |
349 |             .create_account(user_request, "127.0.0.1")
    |              ^^^^^^^^^^^^^^---------------------------
    |                            ||
    |                            |expected `&str`, found `SignupRequest`
    |                            multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
193 |         &self,
194 |         email: &str,
    |         -----------
195 |         username: &str,
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
349 -             .create_account(user_request, "127.0.0.1")
349 +             .create_account(/* &str */, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */)
    |

error[E0061]: this method takes 2 arguments but 3 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:354:26
    |
354 |             auth_service.change_password(&user.id, "SecurePassword123!", "NewSecurePassword456!");
    |                          ^^^^^^^^^^^^^^^                                 ----------------------- unexpected argument #3 of type `&'static str`
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:942:12
    |
942 |     pub fn change_password(&self, user_id: &str, new_password: &str) -> Result<(), String> {
    |            ^^^^^^^^^^^^^^^
help: remove the extra argument
    |
354 -             auth_service.change_password(&user.id, "SecurePassword123!", "NewSecurePassword456!");
354 +             auth_service.change_password(&user.id, "SecurePassword123!");
    |

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\auth_service_tests.rs:359:87
    |
359 |             auth_service.authenticate("changepass@example.com", "SecurePassword123!", "127.0.0.1");
    |                          ------------ arguments to this method are incorrect          ^^^^^^^^^^^ expected `Option<&str>`, found `&str`
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&'static str`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
359 |             auth_service.authenticate("changepass@example.com", "SecurePassword123!", Some("127.0.0.1"));
    |                                                                                       +++++           +

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\auth_service_tests.rs:366:13
    |
363 |         let result = auth_service.authenticate(
    |                                   ------------ arguments to this method are incorrect
...
366 |             "127.0.0.1",
    |             ^^^^^^^^^^^ expected `Option<&str>`, found `&str`
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&'static str`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
366 |             Some("127.0.0.1"),
    |             +++++           +

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:380:14
    |
380 |             .create_account(user_request, "127.0.0.1")
    |              ^^^^^^^^^^^^^^---------------------------
    |                            ||
    |                            |expected `&str`, found `SignupRequest`
    |                            multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
193 |         &self,
194 |         email: &str,
    |         -----------
195 |         username: &str,
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
380 -             .create_account(user_request, "127.0.0.1")
380 +             .create_account(/* &str */, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */)
    |

error[E0061]: this method takes 2 arguments but 3 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:384:35
    |
384 |         let result = auth_service.change_password(
    |                                   ^^^^^^^^^^^^^^^
...
387 |             "NewSecurePassword456!",
    |             ----------------------- unexpected argument #3 of type `&'static str`
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:942:12
    |
942 |     pub fn change_password(&self, user_id: &str, new_password: &str) -> Result<(), String> {
    |            ^^^^^^^^^^^^^^^
help: remove the extra argument
    |
386 -             "WrongCurrentPassword!",
387 -             "NewSecurePassword456!",
386 +             "WrongCurrentPassword!",
    |

error[E0061]: this method takes 6 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\auth_service_tests.rs:404:14
    |
404 |             .create_account(user_request, "127.0.0.1")
    |              ^^^^^^^^^^^^^^---------------------------
    |                            ||
    |                            |expected `&str`, found `SignupRequest`
    |                            multiple arguments are missing
    |
note: method defined here
   --> src-tauri\src\services\auth.rs:192:12
    |
192 |     pub fn create_account(
    |            ^^^^^^^^^^^^^^
193 |         &self,
194 |         email: &str,
    |         -----------
195 |         username: &str,
196 |         first_name: &str,
    |         ----------------
197 |         last_name: &str,
    |         ---------------
198 |         role: UserRole,
    |         --------------
199 |         password: &str,
    |         --------------
help: provide the arguments
    |
404 -             .create_account(user_request, "127.0.0.1")
404 +             .create_account(/* &str */, "127.0.0.1", /* &str */, /* &str */, /* models::auth::UserRole */, /* &str */)
    |

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\auth_service_tests.rs:410:76
    |
410 |                 .authenticate("cleanup@example.com", "SecurePassword123!", "127.0.0.1")
    |                  ------------ arguments to this method are incorrect       ^^^^^^^^^^^ expected `Option<&str>`, found `&str`
    |
    = note:   expected enum `std::option::Option<&str>`
            found reference `&'static str`
note: method defined here
   --> src-tauri\src\services\auth.rs:455:12
    |
455 |     pub fn authenticate(
    |            ^^^^^^^^^^^^
...
459 |         ip_address: Option<&str>,
    |         ------------------------
help: try wrapping the expression in `Some`
    |
410 |                 .authenticate("cleanup@example.com", "SecurePassword123!", Some("127.0.0.1"))
    |                                                                            +++++           +

error[E0616]: field `db` of struct `services::auth::AuthService` is private
   --> src-tauri\src\tests\unit\auth_service_tests.rs:416:22
    |
416 |                     .db
    |                      ^^ private field

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\auth_service_tests.rs:421:53
    |
421 |                     [Utc::now().timestamp() - 3600, session.token],
    |                                                     ^^^^^^^^^^^^^ expected `i64`, found `String`

error[E0560]: struct `UpdateClientRequest` has no field named `address`
   --> src-tauri\src\tests\unit\client_service_tests.rs:145:13
    |
145 |             address: Some("456 New Address".to_string()),
    |             ^^^^^^^ `UpdateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `UpdateClientRequest` has no field named `company`
   --> src-tauri\src\tests\unit\client_service_tests.rs:146:13
    |
146 |             company: Some("Updated Company".to_string()),
    |             ^^^^^^^ `UpdateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0560]: struct `UpdateClientRequest` has no field named `is_active`
   --> src-tauri\src\tests\unit\client_service_tests.rs:148:13
    |
148 |             is_active: Some(true),
    |             ^^^^^^^^^ `UpdateClientRequest` does not have this field
    |
    = note: available fields are: `customer_type`, `address_street`, `address_city`, `address_state`, `address_zip` ... and 5 others

error[E0277]: the trait bound `UpdateClientRequest: std::default::Default` is not satisfied
   --> src-tauri\src\tests\unit\client_service_tests.rs:178:15
    |
178 |             ..Default::default()
    |               ^^^^^^^^^^^^^^^^^^ the trait `std::default::Default` is not implemented for `UpdateClientRequest`
    |
help: consider annotating `UpdateClientRequest` with `#[derive(Default)]`
   --> src-tauri\src\models\client.rs:240:1
    |
240 + #[derive(Default)]
241 | pub struct UpdateClientRequest {
    |

error[E0560]: struct `UpdateClientRequest` has no field named `is_active`
   --> src-tauri\src\tests\unit\client_service_tests.rs:202:13
    |
202 |             is_active: Some(false),
    |             ^^^^^^^^^ `UpdateClientRequest` does not have this field
    |
    = note: available fields are: `name`, `email`, `phone`, `customer_type`, `address_street` ... and 9 others

error[E0599]: no method named `list_active_clients_async` found for struct `services::client::ClientService` in the current scope
   --> src-tauri\src\tests\unit\client_service_tests.rs:212:38
    |
212 |         let active_clients = service.list_active_clients_async(100, 0).await?;
    |                                      ^^^^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\client.rs:18:1
    |
 18 | pub struct ClientService {
    | ------------------------ method `list_active_clients_async` not found for this struct
    |
help: there is a method `create_client_async` with a similar name
    |
212 -         let active_clients = service.list_active_clients_async(100, 0).await?;
212 +         let active_clients = service.create_client_async(100, 0).await?;
    |

error[E0599]: no method named `get_client_by_id_async` found for struct `services::client::ClientService` in the current scope
   --> src-tauri\src\tests\unit\client_service_tests.rs:233:40
    |
233 |         let retrieved_client = service.get_client_by_id_async(&created_client.id).await?;
    |                                        ^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\client.rs:18:1
    |
 18 | pub struct ClientService {
    | ------------------------ method `get_client_by_id_async` not found for this struct
    |
help: there is a method `get_client_async` with a similar name
    |
233 -         let retrieved_client = service.get_client_by_id_async(&created_client.id).await?;
233 +         let retrieved_client = service.get_client_async(&created_client.id).await?;
    |

error[E0599]: no method named `get_client_by_id_async` found for struct `services::client::ClientService` in the current scope
   --> src-tauri\src\tests\unit\client_service_tests.rs:249:40
    |
249 |         let retrieved_client = service.get_client_by_id_async("nonexistent-id").await?;
    |                                        ^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\client.rs:18:1
    |
 18 | pub struct ClientService {
    | ------------------------ method `get_client_by_id_async` not found for this struct
    |
help: there is a method `get_client_async` with a similar name
    |
249 -         let retrieved_client = service.get_client_by_id_async("nonexistent-id").await?;
249 +         let retrieved_client = service.get_client_async("nonexistent-id").await?;
    |

error[E0599]: no method named `get_client_by_email_async` found for struct `services::client::ClientService` in the current scope
   --> src-tauri\src\tests\unit\client_service_tests.rs:271:14
    |
270 |           let retrieved_client = service
    |  ________________________________-
271 | |             .get_client_by_email_async("email@company.com")
    | |_____________-^^^^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\client.rs:18:1
    |
 18 |   pub struct ClientService {
    |   ------------------------ method `get_client_by_email_async` not found for this struct
    |
help: there is a method `get_client_async` with a similar name
    |
271 -             .get_client_by_email_async("email@company.com")
271 +             .get_client_async("email@company.com")
    |

error[E0599]: no method named `get_client_by_email_async` found for struct `services::client::ClientService` in the current scope
   --> src-tauri\src\tests\unit\client_service_tests.rs:281:14
    |
280 |           let not_found = service
    |  _________________________-
281 | |             .get_client_by_email_async("nonexistent@company.com")
    | |_____________-^^^^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\client.rs:18:1
    |
 18 |   pub struct ClientService {
    |   ------------------------ method `get_client_by_email_async` not found for this struct
    |
help: there is a method `get_client_async` with a similar name
    |
281 -             .get_client_by_email_async("nonexistent@company.com")
281 +             .get_client_async("nonexistent@company.com")
    |

error[E0599]: no method named `list_clients_async` found for struct `services::client::ClientService` in the current scope
   --> src-tauri\src\tests\unit\client_service_tests.rs:293:31
    |
293 |         let clients = service.list_clients_async(10, 0).await?;
    |                               ^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\client.rs:18:1
    |
 18 | pub struct ClientService {
    | ------------------------ method `list_clients_async` not found for this struct
    |
help: there is a method `get_clients_async` with a similar name, but with different arguments
   --> src-tauri\src\services\client.rs:383:5
    |
383 | /     pub async fn get_clients_async(
384 | |         &self,
385 | |         query: ClientQuery,
386 | |     ) -> Result<ClientListResponse, String> {
    | |___________________________________________^

error[E0599]: no method named `list_clients_async` found for struct `services::client::ClientService` in the current scope
   --> src-tauri\src\tests\unit\client_service_tests.rs:316:31
    |
316 |         let clients = service.list_clients_async(10, 0).await?;
    |                               ^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\client.rs:18:1
    |
 18 | pub struct ClientService {
    | ------------------------ method `list_clients_async` not found for this struct
    |
help: there is a method `get_clients_async` with a similar name, but with different arguments
   --> src-tauri\src\services\client.rs:383:5
    |
383 | /     pub async fn get_clients_async(
384 | |         &self,
385 | |         query: ClientQuery,
386 | |     ) -> Result<ClientListResponse, String> {
    | |___________________________________________^

error[E0599]: no method named `list_clients_async` found for struct `services::client::ClientService` in the current scope
   --> src-tauri\src\tests\unit\client_service_tests.rs:320:37
    |
320 |         let clients_page1 = service.list_clients_async(2, 0).await?;
    |                                     ^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\client.rs:18:1
    |
 18 | pub struct ClientService {
    | ------------------------ method `list_clients_async` not found for this struct
    |
help: there is a method `get_clients_async` with a similar name, but with different arguments
   --> src-tauri\src\services\client.rs:383:5
    |
383 | /     pub async fn get_clients_async(
384 | |         &self,
385 | |         query: ClientQuery,
386 | |     ) -> Result<ClientListResponse, String> {
    | |___________________________________________^

error[E0599]: no method named `list_clients_async` found for struct `services::client::ClientService` in the current scope
   --> src-tauri\src\tests\unit\client_service_tests.rs:321:37
    |
321 |         let clients_page2 = service.list_clients_async(2, 2).await?;
    |                                     ^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\client.rs:18:1
    |
 18 | pub struct ClientService {
    | ------------------------ method `list_clients_async` not found for this struct
    |
help: there is a method `get_clients_async` with a similar name, but with different arguments
   --> src-tauri\src\services\client.rs:383:5
    |
383 | /     pub async fn get_clients_async(
384 | |         &self,
385 | |         query: ClientQuery,
386 | |     ) -> Result<ClientListResponse, String> {
    | |___________________________________________^

error[E0560]: struct `UpdateClientRequest` has no field named `is_active`
   --> src-tauri\src\tests\unit\client_service_tests.rs:355:13
    |
355 |             is_active: Some(false),
    |             ^^^^^^^^^ `UpdateClientRequest` does not have this field
    |
    = note: available fields are: `name`, `email`, `phone`, `customer_type`, `address_street` ... and 9 others

error[E0599]: no method named `list_active_clients_async` found for struct `services::client::ClientService` in the current scope
   --> src-tauri\src\tests\unit\client_service_tests.rs:363:38
    |
363 |         let active_clients = service.list_active_clients_async(10, 0).await?;
    |                                      ^^^^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\client.rs:18:1
    |
 18 | pub struct ClientService {
    | ------------------------ method `list_active_clients_async` not found for this struct
    |
help: there is a method `create_client_async` with a similar name
    |
363 -         let active_clients = service.list_active_clients_async(10, 0).await?;
363 +         let active_clients = service.create_client_async(10, 0).await?;
    |

error[E0599]: no method named `get_client_by_id_async` found for struct `services::client::ClientService` in the current scope
   --> src-tauri\src\tests\unit\client_service_tests.rs:460:38
    |
460 |         let deleted_client = service.get_client_by_id_async(&created_client.id).await?;
    |                                      ^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\client.rs:18:1
    |
 18 | pub struct ClientService {
    | ------------------------ method `get_client_by_id_async` not found for this struct
    |
help: there is a method `get_client_async` with a similar name
    |
460 -         let deleted_client = service.get_client_by_id_async(&created_client.id).await?;
460 +         let deleted_client = service.get_client_async(&created_client.id).await?;
    |

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\client_service_tests.rs:512:9
    |
480 |     fn test_delete_client_with_tasks() {
    |                                       - help: a return type might be missing here: `-> _`
...
512 |         Ok(())
    |         ^^^^^^ expected `()`, found `Result<(), _>`
    |
    = note: expected unit type `()`
                    found enum `Result<(), _>`

error[E0599]: no method named `get_client_statistics_async` found for struct `services::client::ClientService` in the current scope
   --> src-tauri\src\tests\unit\client_service_tests.rs:553:29
    |
553 |         let stats = service.get_client_statistics_async().await?;
    |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\client.rs:18:1
    |
 18 | pub struct ClientService {
    | ------------------------ method `get_client_statistics_async` not found for this struct
    |
help: there is a method `get_client_stats_async` with a similar name
    |
553 -         let stats = service.get_client_statistics_async().await?;
553 +         let stats = service.get_client_stats_async().await?;
    |

error[E0560]: struct `UpdateClientRequest` has no field named `is_active`
   --> src-tauri\src\tests\unit\client_service_tests.rs:562:13
    |
562 |             is_active: Some(false),
    |             ^^^^^^^^^ `UpdateClientRequest` does not have this field
    |
    = note: available fields are: `name`, `email`, `phone`, `customer_type`, `address_street` ... and 9 others

error[E0599]: no method named `get_client_statistics_async` found for struct `services::client::ClientService` in the current scope
   --> src-tauri\src\tests\unit\client_service_tests.rs:570:37
    |
570 |         let updated_stats = service.get_client_statistics_async().await?;
    |                                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\client.rs:18:1
    |
 18 | pub struct ClientService {
    | ------------------------ method `get_client_statistics_async` not found for this struct
    |
help: there is a method `get_client_stats_async` with a similar name
    |
570 -         let updated_stats = service.get_client_statistics_async().await?;
570 +         let updated_stats = service.get_client_stats_async().await?;
    |

error[E0308]: mismatched types
  --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:42:42
   |
42 |             .start_intervention(request, &task, "test_user")
   |              ------------------          ^^^^^ expected `&str`, found `&CreateTaskRequest`
   |              |
   |              arguments to this method are incorrect
   |
   = note: expected reference `&str`
              found reference `&models::task::CreateTaskRequest`
note: method defined here
  --> src-tauri\src\services\intervention_workflow.rs:43:12
   |
43 |     pub fn start_intervention(
   |            ^^^^^^^^^^^^^^^^^^
...
46 |         user_id: &str,
   |         -------------

error[E0308]: mismatched types
  --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:79:43
   |
79 |             .start_intervention(request1, &task, "test_user")
   |              ------------------           ^^^^^ expected `&str`, found `&CreateTaskRequest`
   |              |
   |              arguments to this method are incorrect
   |
   = note: expected reference `&str`
              found reference `&models::task::CreateTaskRequest`
note: method defined here
  --> src-tauri\src\services\intervention_workflow.rs:43:12
   |
43 |     pub fn start_intervention(
   |            ^^^^^^^^^^^^^^^^^^
...
46 |         user_id: &str,
   |         -------------

error[E0308]: mismatched types
  --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:92:43
   |
92 |             .start_intervention(request2, &task, "test_user")
   |              ------------------           ^^^^^ expected `&str`, found `&CreateTaskRequest`
   |              |
   |              arguments to this method are incorrect
   |
   = note: expected reference `&str`
              found reference `&models::task::CreateTaskRequest`
note: method defined here
  --> src-tauri\src\services\intervention_workflow.rs:43:12
   |
43 |     pub fn start_intervention(
   |            ^^^^^^^^^^^^^^^^^^
...
46 |         user_id: &str,
   |         -------------

error[E0308]: mismatched types
  --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:99:9
   |
62 |     fn test_start_intervention_with_existing_active() {
   |                                                      - help: a return type might be missing here: `-> _`
...
99 |         Ok(())
   |         ^^^^^^ expected `()`, found `Result<(), _>`
   |
   = note: expected unit type `()`
                   found enum `Result<(), _>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:119:42
    |
119 |             .start_intervention(request, &task, "test_user")
    |              ------------------          ^^^^^ expected `&str`, found `&CreateTaskRequest`
    |              |
    |              arguments to this method are incorrect
    |
    = note: expected reference `&str`
               found reference `&models::task::CreateTaskRequest`
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:43:12
    |
 43 |     pub fn start_intervention(
    |            ^^^^^^^^^^^^^^^^^^
...
 46 |         user_id: &str,
    |         -------------

error[E0061]: this method takes 3 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:141:14
    |
141 |             .advance_step(advance_request, "test_user")
    |              ^^^^^^^^^^^^------------------------------ argument #3 of type `std::option::Option<&str>` is missing
    |
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:311:18
    |
311 |     pub async fn advance_step(
    |                  ^^^^^^^^^^^^
...
315 |         user_id: Option<&str>,
    |         ---------------------
help: provide the argument
    |
141 |             .advance_step(advance_request, "test_user", /* std::option::Option<&str> */)
    |                                                       +++++++++++++++++++++++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:172:42
    |
172 |             .start_intervention(request, &task, "test_user")
    |              ------------------          ^^^^^ expected `&str`, found `&CreateTaskRequest`
    |              |
    |              arguments to this method are incorrect
    |
    = note: expected reference `&str`
               found reference `&models::task::CreateTaskRequest`
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:43:12
    |
 43 |     pub fn start_intervention(
    |            ^^^^^^^^^^^^^^^^^^
...
 46 |         user_id: &str,
    |         -------------

error[E0061]: this method takes 3 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:189:14
    |
189 |             .advance_step(start_request, "test_user")
    |              ^^^^^^^^^^^^---------------------------- argument #3 of type `std::option::Option<&str>` is missing
    |
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:311:18
    |
311 |     pub async fn advance_step(
    |                  ^^^^^^^^^^^^
...
315 |         user_id: Option<&str>,
    |         ---------------------
help: provide the argument
    |
189 |             .advance_step(start_request, "test_user", /* std::option::Option<&str> */)
    |                                                     +++++++++++++++++++++++++++++++++

error[E0061]: this method takes 3 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:226:14
    |
226 |             .advance_step(complete_request, "test_user")
    |              ^^^^^^^^^^^^------------------------------- argument #3 of type `std::option::Option<&str>` is missing
    |
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:311:18
    |
311 |     pub async fn advance_step(
    |                  ^^^^^^^^^^^^
...
315 |         user_id: Option<&str>,
    |         ---------------------
help: provide the argument
    |
226 |             .advance_step(complete_request, "test_user", /* std::option::Option<&str> */)
    |                                                        +++++++++++++++++++++++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:257:42
    |
257 |             .start_intervention(request, &task, "test_user")
    |              ------------------          ^^^^^ expected `&str`, found `&CreateTaskRequest`
    |              |
    |              arguments to this method are incorrect
    |
    = note: expected reference `&str`
               found reference `&models::task::CreateTaskRequest`
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:43:12
    |
 43 |     pub fn start_intervention(
    |            ^^^^^^^^^^^^^^^^^^
...
 46 |         user_id: &str,
    |         -------------

error[E0061]: this method takes 3 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:275:14
    |
275 |             .advance_step(complete_request, "test_user")
    |              ^^^^^^^^^^^^------------------------------- argument #3 of type `std::option::Option<&str>` is missing
    |
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:311:18
    |
311 |     pub async fn advance_step(
    |                  ^^^^^^^^^^^^
...
315 |         user_id: Option<&str>,
    |         ---------------------
help: provide the argument
    |
275 |             .advance_step(complete_request, "test_user", /* std::option::Option<&str> */)
    |                                                        +++++++++++++++++++++++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:282:9
    |
241 |     fn test_advance_step_invalid_transition() {
    |                                              - help: a return type might be missing here: `-> _`
...
282 |         Ok(())
    |         ^^^^^^ expected `()`, found `Result<(), _>`
    |
    = note: expected unit type `()`
                    found enum `Result<(), _>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:302:42
    |
302 |             .start_intervention(request, &task, "test_user")
    |              ------------------          ^^^^^ expected `&str`, found `&CreateTaskRequest`
    |              |
    |              arguments to this method are incorrect
    |
    = note: expected reference `&str`
               found reference `&models::task::CreateTaskRequest`
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:43:12
    |
 43 |     pub fn start_intervention(
    |            ^^^^^^^^^^^^^^^^^^
...
 46 |         user_id: &str,
    |         -------------

error[E0061]: this method takes 3 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:318:18
    |
318 |                 .advance_step(start_request, "test_user")
    |                  ^^^^^^^^^^^^---------------------------- argument #3 of type `std::option::Option<&str>` is missing
    |
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:311:18
    |
311 |     pub async fn advance_step(
    |                  ^^^^^^^^^^^^
...
315 |         user_id: Option<&str>,
    |         ---------------------
help: provide the argument
    |
318 |                 .advance_step(start_request, "test_user", /* std::option::Option<&str> */)
    |                                                         +++++++++++++++++++++++++++++++++

error[E0061]: this method takes 3 arguments but 2 arguments were supplied
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:332:18
    |
332 |                 .advance_step(complete_request, "test_user")
    |                  ^^^^^^^^^^^^------------------------------- argument #3 of type `std::option::Option<&str>` is missing
    |
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:311:18
    |
311 |     pub async fn advance_step(
    |                  ^^^^^^^^^^^^
...
315 |         user_id: Option<&str>,
    |         ---------------------
help: provide the argument
    |
332 |                 .advance_step(complete_request, "test_user", /* std::option::Option<&str> */)
    |                                                            +++++++++++++++++++++++++++++++++

error[E0599]: no method named `complete_intervention` found for struct `services::intervention_workflow::InterventionWorkflowService` in the current scope
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:346:14
    |
345 |           let completed_intervention = workflow_service
    |  ______________________________________-
346 | |             .complete_intervention(complete_request, "test_user")
    | |_____________-^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\intervention_workflow.rs:26:1
    |
 26 |   pub struct InterventionWorkflowService {
    |   -------------------------------------- method `complete_intervention` not found for this struct
    |
help: there is a method `finalize_intervention` with a similar name, but with different arguments
   --> src-tauri\src\services\intervention_workflow.rs:652:5
    |
652 | /     pub fn finalize_intervention(
653 | |         &self,
654 | |         request: FinalizeInterventionRequest,
655 | |         correlation_id: &str,
656 | |         user_id: Option<&str>,
657 | |     ) -> InterventionResult<FinalizeInterventionResponse> {
    | |_________________________________________________________^

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:382:42
    |
382 |             .start_intervention(request, &task, "test_user")
    |              ------------------          ^^^^^ expected `&str`, found `&CreateTaskRequest`
    |              |
    |              arguments to this method are incorrect
    |
    = note: expected reference `&str`
               found reference `&models::task::CreateTaskRequest`
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:43:12
    |
 43 |     pub fn start_intervention(
    |            ^^^^^^^^^^^^^^^^^^
...
 46 |         user_id: &str,
    |         -------------

error[E0599]: no method named `complete_intervention` found for struct `services::intervention_workflow::InterventionWorkflowService` in the current scope
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:396:14
    |
395 |           let result = workflow_service
    |  ______________________-
396 | |             .complete_intervention(complete_request, "test_user")
    | |_____________-^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\intervention_workflow.rs:26:1
    |
 26 |   pub struct InterventionWorkflowService {
    |   -------------------------------------- method `complete_intervention` not found for this struct
    |
help: there is a method `finalize_intervention` with a similar name, but with different arguments
   --> src-tauri\src\services\intervention_workflow.rs:652:5
    |
652 | /     pub fn finalize_intervention(
653 | |         &self,
654 | |         request: FinalizeInterventionRequest,
655 | |         correlation_id: &str,
656 | |         user_id: Option<&str>,
657 | |     ) -> InterventionResult<FinalizeInterventionResponse> {
    | |_________________________________________________________^

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:401:9
    |
366 |     fn test_complete_intervention_incomplete_steps() {
    |                                                     - help: a return type might be missing here: `-> _`
...
401 |         Ok(())
    |         ^^^^^^ expected `()`, found `Result<(), _>`
    |
    = note: expected unit type `()`
                    found enum `Result<(), _>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:421:42
    |
421 |             .start_intervention(request, &task, "test_user")
    |              ------------------          ^^^^^ expected `&str`, found `&CreateTaskRequest`
    |              |
    |              arguments to this method are incorrect
    |
    = note: expected reference `&str`
               found reference `&models::task::CreateTaskRequest`
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:43:12
    |
 43 |     pub fn start_intervention(
    |            ^^^^^^^^^^^^^^^^^^
...
 46 |         user_id: &str,
    |         -------------

error[E0599]: no method named `cancel_intervention` found for struct `services::intervention_workflow::InterventionWorkflowService` in the current scope
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:432:14
    |
431 |           let cancelled_intervention = workflow_service
    |  ______________________________________-
432 | |             .cancel_intervention(cancel_request, "test_user")
    | |_____________-^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\intervention_workflow.rs:26:1
    |
 26 |   pub struct InterventionWorkflowService {
    |   -------------------------------------- method `cancel_intervention` not found for this struct
    |
help: there is a method `start_intervention` with a similar name, but with different arguments
   --> src-tauri\src\services\intervention_workflow.rs:43:5
    |
 43 | /     pub fn start_intervention(
 44 | |         &self,
 45 | |         request: StartInterventionRequest,
 46 | |         user_id: &str,
 47 | |         correlation_id: &str,
 48 | |     ) -> InterventionResult<StartInterventionResponse> {
    | |______________________________________________________^

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:464:42
    |
464 |             .start_intervention(request, &task, "test_user")
    |              ------------------          ^^^^^ expected `&str`, found `&CreateTaskRequest`
    |              |
    |              arguments to this method are incorrect
    |
    = note: expected reference `&str`
               found reference `&models::task::CreateTaskRequest`
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:43:12
    |
 43 |     pub fn start_intervention(
    |            ^^^^^^^^^^^^^^^^^^
...
 46 |         user_id: &str,
    |         -------------

error[E0599]: no method named `get_intervention_by_id` found for struct `services::intervention_workflow::InterventionWorkflowService` in the current scope
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:469:14
    |
468 |           let retrieved_intervention = workflow_service
    |  ______________________________________-
469 | |             .get_intervention_by_id(&created_intervention.id)
    | |             -^^^^^^^^^^^^^^^^^^^^^^ method not found in `services::intervention_workflow::InterventionWorkflowService`
    | |_____________|
    |
    |
   ::: src-tauri\src\services\intervention_workflow.rs:26:1
    |
 26 |   pub struct InterventionWorkflowService {
    |   -------------------------------------- method `get_intervention_by_id` not found for this struct

error[E0599]: no method named `get_intervention_by_id` found for struct `services::intervention_workflow::InterventionWorkflowService` in the current scope
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:486:14
    |
485 |           let retrieved_intervention = workflow_service
    |  ______________________________________-
486 | |             .get_intervention_by_id("nonexistent-id")
    | |             -^^^^^^^^^^^^^^^^^^^^^^ method not found in `services::intervention_workflow::InterventionWorkflowService`
    | |_____________|
    |
    |
   ::: src-tauri\src\services\intervention_workflow.rs:26:1
    |
 26 |   pub struct InterventionWorkflowService {
    |   -------------------------------------- method `get_intervention_by_id` not found for this struct

error[E0599]: no method named `list_interventions` found for struct `services::intervention_workflow::InterventionWorkflowService` in the current scope
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:498:46
    |
498 |         let interventions = workflow_service.list_interventions(10, 0).await?;
    |                                              ^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\intervention_workflow.rs:26:1
    |
 26 | pub struct InterventionWorkflowService {
    | -------------------------------------- method `list_interventions` not found for this struct
    |
help: there is a method `start_intervention` with a similar name, but with different arguments
   --> src-tauri\src\services\intervention_workflow.rs:43:5
    |
 43 | /     pub fn start_intervention(
 44 | |         &self,
 45 | |         request: StartInterventionRequest,
 46 | |         user_id: &str,
 47 | |         correlation_id: &str,
 48 | |     ) -> InterventionResult<StartInterventionResponse> {
    | |______________________________________________________^

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:522:46
    |
522 |                 .start_intervention(request, &task, "test_user")
    |                  ------------------          ^^^^^ expected `&str`, found `&CreateTaskRequest`
    |                  |
    |                  arguments to this method are incorrect
    |
    = note: expected reference `&str`
               found reference `&models::task::CreateTaskRequest`
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:43:12
    |
 43 |     pub fn start_intervention(
    |            ^^^^^^^^^^^^^^^^^^
...
 46 |         user_id: &str,
    |         -------------

error[E0599]: no method named `list_interventions` found for struct `services::intervention_workflow::InterventionWorkflowService` in the current scope
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:527:46
    |
527 |         let interventions = workflow_service.list_interventions(10, 0).await?;
    |                                              ^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\intervention_workflow.rs:26:1
    |
 26 | pub struct InterventionWorkflowService {
    | -------------------------------------- method `list_interventions` not found for this struct
    |
help: there is a method `start_intervention` with a similar name, but with different arguments
   --> src-tauri\src\services\intervention_workflow.rs:43:5
    |
 43 | /     pub fn start_intervention(
 44 | |         &self,
 45 | |         request: StartInterventionRequest,
 46 | |         user_id: &str,
 47 | |         correlation_id: &str,
 48 | |     ) -> InterventionResult<StartInterventionResponse> {
    | |______________________________________________________^

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:550:42
    |
550 |             .start_intervention(request, &task, "test_user")
    |              ------------------          ^^^^^ expected `&str`, found `&CreateTaskRequest`
    |              |
    |              arguments to this method are incorrect
    |
    = note: expected reference `&str`
               found reference `&models::task::CreateTaskRequest`
note: method defined here
   --> src-tauri\src\services\intervention_workflow.rs:43:12
    |
 43 |     pub fn start_intervention(
    |            ^^^^^^^^^^^^^^^^^^
...
 46 |         user_id: &str,
    |         -------------

error[E0599]: no method named `get_interventions_by_task` found for struct `services::intervention_workflow::InterventionWorkflowService` in the current scope
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:555:14
    |
554 |           let task_interventions = workflow_service
    |  __________________________________-
555 | |             .get_interventions_by_task("task-123")
    | |             -^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `services::intervention_workflow::InterventionWorkflowService`
    | |_____________|
    |
    |
   ::: src-tauri\src\services\intervention_workflow.rs:26:1
    |
 26 |   pub struct InterventionWorkflowService {
    |   -------------------------------------- method `get_interventions_by_task` not found for this struct

error[E0599]: no method named `get_interventions_by_task` found for struct `services::intervention_workflow::InterventionWorkflowService` in the current scope
   --> src-tauri\src\tests\unit\intervention_workflow_tests.rs:563:14
    |
562 |           let empty_interventions = workflow_service
    |  ___________________________________-
563 | |             .get_interventions_by_task("nonexistent-task")
    | |             -^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `services::intervention_workflow::InterventionWorkflowService`
    | |_____________|
    |
    |
   ::: src-tauri\src\services\intervention_workflow.rs:26:1
    |
 26 |   pub struct InterventionWorkflowService {
    |   -------------------------------------- method `get_interventions_by_task` not found for this struct

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:27:39
    |
 27 |         let result = security_service.log_event(
    |                                       ^^^^^^^^^
 28 |             "login_success",
    |             --------------- expected `SecurityEvent`, found `&str`
 29 |             "user123",
    |             --------- unexpected argument #2 of type `&'static str`
 30 |             Some("192.168.1.100"),
    |             --------------------- unexpected argument #3 of type `std::option::Option<&str>`
 31 |             Some("Mozilla/5.0..."),
    |             ---------------------- unexpected argument #4 of type `std::option::Option<&str>`
 32 |             None,
    |             ---- unexpected argument #5 of type `std::option::Option<_>`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
 28 -             "login_success",
 28 +             /* SecurityEvent */,
    |

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:46:39
    |
 46 |         let result = security_service.log_event(
    |                                       ^^^^^^^^^
 47 |             "login_failed",
    |             -------------- expected `SecurityEvent`, found `&str`
 48 |             "user123",
    |             --------- unexpected argument #2 of type `&'static str`
 49 |             Some("192.168.1.100"),
    |             --------------------- unexpected argument #3 of type `std::option::Option<&str>`
 50 |             Some("Mozilla/5.0..."),
    |             ---------------------- unexpected argument #4 of type `std::option::Option<&str>`
 51 |             Some("Invalid password"),
    |             ------------------------ unexpected argument #5 of type `std::option::Option<&str>`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
 47 -             "login_failed",
 47 +             /* SecurityEvent */,
    |

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:65:39
    |
 65 |         let result = security_service.log_event(
    |                                       ^^^^^^^^^
 66 |             "suspicious_activity",
    |             --------------------- expected `SecurityEvent`, found `&str`
 67 |             "user123",
    |             --------- unexpected argument #2 of type `&'static str`
 68 |             Some("192.168.1.100"),
    |             --------------------- unexpected argument #3 of type `std::option::Option<&str>`
 69 |             Some("Mozilla/5.0..."),
    |             ---------------------- unexpected argument #4 of type `std::option::Option<&str>`
 70 |             Some("Multiple failed attempts from different IPs"),
    |             --------------------------------------------------- unexpected argument #5 of type `std::option::Option<&str>`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
 66 -             "suspicious_activity",
 66 +             /* SecurityEvent */,
    |

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:87:18
    |
 87 |                 .log_event(
    |                  ^^^^^^^^^
 88 |                     "login_failed",
    |                     -------------- expected `SecurityEvent`, found `&str`
 89 |                     &format!("user{}", i),
    |                     --------------------- unexpected argument #2 of type `&std::string::String`
 90 |                     Some(ip_address),
    |                     ---------------- unexpected argument #3 of type `std::option::Option<&str>`
 91 |                     None,
    |                     ---- unexpected argument #4 of type `std::option::Option<_>`
 92 |                     None,
    |                     ---- unexpected argument #5 of type `std::option::Option<_>`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
 88 -                     "login_failed",
 88 +                     /* SecurityEvent */,
    |

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:113:18
    |
113 |                 .log_event(
    |                  ^^^^^^^^^
114 |                     "login_failed",
    |                     -------------- expected `SecurityEvent`, found `&str`
115 |                     &format!("user{}", i),
    |                     --------------------- unexpected argument #2 of type `&std::string::String`
116 |                     Some(ip_address),
    |                     ---------------- unexpected argument #3 of type `std::option::Option<&str>`
117 |                     None,
    |                     ---- unexpected argument #4 of type `std::option::Option<_>`
118 |                     None,
    |                     ---- unexpected argument #5 of type `std::option::Option<_>`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
114 -                     "login_failed",
114 +                     /* SecurityEvent */,
    |

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:140:18
    |
140 |                 .log_event("login_failed", &format!("user{}", i), Some(ip1), None, None)
    |                  ^^^^^^^^^ --------------  ---------------------  ---------  ----  ---- unexpected argument #5 of type `std::option::Option<_>`
    |                            |               |                      |          |
    |                            |               |                      |          unexpected argument #4 of type `std::option::Option<_>`
    |                            |               |                      unexpected argument #3 of type `std::option::Option<&str>`
    |                            |               unexpected argument #2 of type `&std::string::String`
    |                            expected `SecurityEvent`, found `&str`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
140 -                 .log_event("login_failed", &format!("user{}", i), Some(ip1), None, None)
140 +                 .log_event(/* SecurityEvent */)
    |

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:164:18
    |
164 |                 .log_event(
    |                  ^^^^^^^^^
165 |                     "login_failed",
    |                     -------------- expected `SecurityEvent`, found `&str`
166 |                     &format!("user{}", i),
    |                     --------------------- unexpected argument #2 of type `&std::string::String`
167 |                     Some("192.168.1.220"),
    |                     --------------------- unexpected argument #3 of type `std::option::Option<&str>`
168 |                     None,
    |                     ---- unexpected argument #4 of type `std::option::Option<_>`
169 |                     None,
    |                     ---- unexpected argument #5 of type `std::option::Option<_>`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
165 -                     "login_failed",
165 +                     /* SecurityEvent */,
    |

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:176:18
    |
176 |                 .log_event(
    |                  ^^^^^^^^^
177 |                     "suspicious_activity",
    |                     --------------------- expected `SecurityEvent`, found `&str`
178 |                     &format!("user{}", i),
    |                     --------------------- unexpected argument #2 of type `&std::string::String`
179 |                     Some("192.168.1.220"),
    |                     --------------------- unexpected argument #3 of type `std::option::Option<&str>`
180 |                     None,
    |                     ---- unexpected argument #4 of type `std::option::Option<_>`
181 |                     Some("Suspicious pattern detected"),
    |                     ----------------------------------- unexpected argument #5 of type `std::option::Option<&str>`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
177 -                     "suspicious_activity",
177 +                     /* SecurityEvent */,
    |

error[E0624]: method `check_alert_thresholds` is private
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:188:14
    |
188 |             .check_alert_thresholds()
    |              ^^^^^^^^^^^^^^^^^^^^^^ private method
    |
   ::: src-tauri\src\services\security_monitor.rs:436:5
    |
436 |     fn check_alert_thresholds(&self, event: &SecurityEvent) -> Result<(), String> {
    |     ----------------------------------------------------------------------------- private method defined here

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:217:18
    |
217 |                 .log_event(
    |                  ^^^^^^^^^
218 |                     "login_success",
    |                     --------------- expected `SecurityEvent`, found `&str`
219 |                     &format!("user{}", i),
    |                     --------------------- unexpected argument #2 of type `&std::string::String`
220 |                     Some("192.168.1.230"),
    |                     --------------------- unexpected argument #3 of type `std::option::Option<&str>`
221 |                     None,
    |                     ---- unexpected argument #4 of type `std::option::Option<_>`
222 |                     None,
    |                     ---- unexpected argument #5 of type `std::option::Option<_>`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
218 -                     "login_success",
218 +                     /* SecurityEvent */,
    |

error[E0616]: field `db` of struct `security_monitor::SecurityMonitorService` is private
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:229:14
    |
229 |             .db
    |              ^^ private field

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:241:21
    |
241 |                     None::<String>,
    |                     ^^^^^^^^^^^^^^ expected `String`, found `Option<String>`
    |
    = note: expected struct `std::string::String`
                 found enum `std::option::Option<std::string::String>`

error[E0599]: no method named `get_security_metrics` found for struct `security_monitor::SecurityMonitorService` in the current scope
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:251:14
    |
250 |           let metrics = security_service
    |  _______________________-
251 | |             .get_security_metrics(60)
    | |_____________-^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\security_monitor.rs:77:1
    |
 77 |   pub struct SecurityMonitorService {
    |   --------------------------------- method `get_security_metrics` not found for this struct
    |
help: there is a method `get_metrics` with a similar name, but with different arguments
   --> src-tauri\src\services\security_monitor.rs:294:5
    |
294 |     pub fn get_metrics(&self) -> SecurityMetrics {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0616]: field `db` of struct `security_monitor::SecurityMonitorService` is private
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:273:14
    |
273 |             .db
    |              ^^ private field

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:295:18
    |
295 |                 .log_event(
    |                  ^^^^^^^^^
296 |                     "login_success",
    |                     --------------- expected `SecurityEvent`, found `&str`
297 |                     &format!("user{}", i),
    |                     --------------------- unexpected argument #2 of type `&std::string::String`
298 |                     Some("192.168.1.241"),
    |                     --------------------- unexpected argument #3 of type `std::option::Option<&str>`
299 |                     None,
    |                     ---- unexpected argument #4 of type `std::option::Option<_>`
300 |                     None,
    |                     ---- unexpected argument #5 of type `std::option::Option<_>`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
296 -                     "login_success",
296 +                     /* SecurityEvent */,
    |

error[E0061]: this method takes 0 arguments but 1 argument was supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:316:14
    |
316 |             .cleanup_old_events(7)
    |              ^^^^^^^^^^^^^^^^^^ - unexpected argument of type `{integer}`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:389:12
    |
389 |     pub fn cleanup_old_events(&self) -> Result<(), String> {
    |            ^^^^^^^^^^^^^^^^^^
help: remove the extra argument
    |
316 -             .cleanup_old_events(7)
316 +             .cleanup_old_events()
    |

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:319:35
    |
319 |         assert_eq!(cleanup_count, 20, "Should cleanup 20 old events");
    |                                   ^^ expected `()`, found integer

error[E0616]: field `db` of struct `security_monitor::SecurityMonitorService` is private
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:338:14
    |
338 |             .db
    |              ^^ private field

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:351:21
    |
351 |                     Some("192.168.1.250".to_string()),
    |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `Option<String>`
    |
    = note: expected struct `std::string::String`
                 found enum `std::option::Option<std::string::String>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:370:21
    |
370 |                     Some("192.168.1.251".to_string()),
    |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `Option<String>`
    |
    = note: expected struct `std::string::String`
                 found enum `std::option::Option<std::string::String>`

error[E0599]: no method named `cleanup_old_alerts` found for struct `security_monitor::SecurityMonitorService` in the current scope
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:390:14
    |
389 |           let cleanup_count = security_service
    |  _____________________________-
390 | |             .cleanup_old_alerts(7)
    | |_____________-^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\security_monitor.rs:77:1
    |
 77 |   pub struct SecurityMonitorService {
    |   --------------------------------- method `cleanup_old_alerts` not found for this struct
    |
help: there is a method `cleanup_old_events` with a similar name, but with different arguments
   --> src-tauri\src\services\security_monitor.rs:389:5
    |
389 |     pub fn cleanup_old_events(&self) -> Result<(), String> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:412:18
    |
412 |                 .log_event(
    |                  ^^^^^^^^^
413 |                     "login_failed",
    |                     -------------- expected `SecurityEvent`, found `&str`
414 |                     &format!("user{}", i),
    |                     --------------------- unexpected argument #2 of type `&std::string::String`
415 |                     Some("192.168.1.260"),
    |                     --------------------- unexpected argument #3 of type `std::option::Option<&str>`
416 |                     None,
    |                     ---- unexpected argument #4 of type `std::option::Option<_>`
417 |                     None,
    |                     ---- unexpected argument #5 of type `std::option::Option<_>`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
413 -                     "login_failed",
413 +                     /* SecurityEvent */,
    |

error[E0624]: method `check_alert_thresholds` is private
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:424:14
    |
424 |             .check_alert_thresholds()
    |              ^^^^^^^^^^^^^^^^^^^^^^ private method
    |
   ::: src-tauri\src\services\security_monitor.rs:436:5
    |
436 |     fn check_alert_thresholds(&self, event: &SecurityEvent) -> Result<(), String> {
    |     ----------------------------------------------------------------------------- private method defined here

error[E0599]: no method named `expect` found for struct `Vec<SecurityAlert>` in the current scope
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:430:14
    |
428 |           let active_alerts = security_service
    |  _____________________________-
429 | |             .get_active_alerts()
430 | |             .expect("Failed to get active alerts");
    | |             -^^^^^^ method not found in `Vec<SecurityAlert>`
    | |_____________|
    |

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:453:18
    |
453 |                 .log_event(
    |                  ^^^^^^^^^
454 |                     "login_failed",
    |                     -------------- expected `SecurityEvent`, found `&str`
455 |                     &format!("user{}", i),
    |                     --------------------- unexpected argument #2 of type `&std::string::String`
456 |                     Some("192.168.1.270"),
    |                     --------------------- unexpected argument #3 of type `std::option::Option<&str>`
457 |                     None,
    |                     ---- unexpected argument #4 of type `std::option::Option<_>`
458 |                     None,
    |                     ---- unexpected argument #5 of type `std::option::Option<_>`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
454 -                     "login_failed",
454 +                     /* SecurityEvent */,
    |

error[E0624]: method `check_alert_thresholds` is private
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:464:14
    |
464 |             .check_alert_thresholds()
    |              ^^^^^^^^^^^^^^^^^^^^^^ private method
    |
   ::: src-tauri\src\services\security_monitor.rs:436:5
    |
436 |     fn check_alert_thresholds(&self, event: &SecurityEvent) -> Result<(), String> {
    |     ----------------------------------------------------------------------------- private method defined here

error[E0599]: no method named `expect` found for struct `Vec<SecurityAlert>` in the current scope
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:468:14
    |
466 |           let active_alerts = security_service
    |  _____________________________-
467 | |             .get_active_alerts()
468 | |             .expect("Failed to get active alerts");
    | |             -^^^^^^ method not found in `Vec<SecurityAlert>`
    | |_____________|
    |

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:478:54
    |
478 |             security_service.resolve_alert(alert_id, "False positive - legitimate testing");
    |                              -------------           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `Vec<String>`, found `&str`
    |                              |
    |                              arguments to this method are incorrect
    |
    = note: expected struct `Vec<std::string::String>`
            found reference `&'static str`
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:340:12
    |
340 |     pub fn resolve_alert(&self, alert_id: &str, actions_taken: Vec<String>) -> Result<(), String> {
    |            ^^^^^^^^^^^^^                        --------------------------

error[E0599]: no method named `expect` found for struct `Vec<SecurityAlert>` in the current scope
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:485:14
    |
483 |           let updated_alerts = security_service
    |  ______________________________-
484 | |             .get_active_alerts()
485 | |             .expect("Failed to get active alerts");
    | |             -^^^^^^ method not found in `Vec<SecurityAlert>`
    | |_____________|
    |

error[E0616]: field `db` of struct `security_monitor::SecurityMonitorService` is private
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:506:14
    |
506 |             .db
    |              ^^ private field

error[E0599]: no method named `get_security_metrics` found for struct `security_monitor::SecurityMonitorService` in the current scope
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:544:14
    |
543 |           let metrics_1h = security_service
    |  __________________________-
544 | |             .get_security_metrics(60)
    | |_____________-^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\security_monitor.rs:77:1
    |
 77 |   pub struct SecurityMonitorService {
    |   --------------------------------- method `get_security_metrics` not found for this struct
    |
help: there is a method `get_metrics` with a similar name, but with different arguments
   --> src-tauri\src\services\security_monitor.rs:294:5
    |
294 |     pub fn get_metrics(&self) -> SecurityMetrics {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `get_security_metrics` found for struct `security_monitor::SecurityMonitorService` in the current scope
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:547:14
    |
546 |           let metrics_3h = security_service
    |  __________________________-
547 | |             .get_security_metrics(180)
    | |_____________-^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\security_monitor.rs:77:1
    |
 77 |   pub struct SecurityMonitorService {
    |   --------------------------------- method `get_security_metrics` not found for this struct
    |
help: there is a method `get_metrics` with a similar name, but with different arguments
   --> src-tauri\src\services\security_monitor.rs:294:5
    |
294 |     pub fn get_metrics(&self) -> SecurityMetrics {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:574:39
    |
574 |         let result = security_service.log_event("test_event", "", None, None, None);
    |                                       ^^^^^^^^^ ------------  --  ----  ----  ---- unexpected argument #5 of type `std::option::Option<_>`
    |                                                 |             |   |     |
    |                                                 |             |   |     unexpected argument #4 of type `std::option::Option<_>`
    |                                                 |             |   unexpected argument #3 of type `std::option::Option<_>`
    |                                                 |             unexpected argument #2 of type `&'static str`
    |                                                 expected `SecurityEvent`, found `&str`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
574 -         let result = security_service.log_event("test_event", "", None, None, None);
574 +         let result = security_service.log_event(/* SecurityEvent */);
    |

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:579:39
    |
579 |         let result = security_service.log_event(
    |                                       ^^^^^^^^^
580 |             &long_string,
    |             ------------ expected `SecurityEvent`, found `&String`
581 |             &long_string,
    |             ------------ unexpected argument #2 of type `&std::string::String`
582 |             Some(&long_string),
    |             ------------------ unexpected argument #3 of type `std::option::Option<&std::string::String>`
583 |             Some(&long_string),
    |             ------------------ unexpected argument #4 of type `std::option::Option<&std::string::String>`
584 |             Some(&long_string),
    |             ------------------ unexpected argument #5 of type `std::option::Option<&std::string::String>`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
580 -             &long_string,
580 +             /* SecurityEvent */,
    |

error[E0061]: this method takes 1 argument but 5 arguments were supplied
   --> src-tauri\src\tests\unit\security_monitor_service_tests.rs:589:39
    |
589 |         let result = security_service.log_event(
    |                                       ^^^^^^^^^
590 |             "test_event_特殊字符_🔒",
    |             ------------------------ expected `SecurityEvent`, found `&str`
591 |             "user_特殊字符",
    |             --------------- unexpected argument #2 of type `&'static str`
592 |             Some("192.168.1.测试"),
    |             ---------------------- unexpected argument #3 of type `std::option::Option<&str>`
593 |             Some("Mozilla/5.0...🦊"),
    |             ------------------------ unexpected argument #4 of type `std::option::Option<&str>`
594 |             Some("Details with émojis 🔐 and accents"),
    |             ------------------------------------------ unexpected argument #5 of type `std::option::Option<&str>`
    |
note: method defined here
   --> src-tauri\src\services\security_monitor.rs:199:12
    |
199 |     pub fn log_event(&self, event: SecurityEvent) -> Result<(), String> {
    |            ^^^^^^^^^        --------------------
help: remove the extra arguments
    |
590 -             "test_event_特殊字符_🔒",
590 +             /* SecurityEvent */,
    |

error[E0308]: mismatched types
  --> src-tauri\src\tests\unit\task_creation_service_tests.rs:40:40
   |
40 |         assert_eq!(task.vehicle_plate, "ABC123");
   |                                        ^^^^^^^^ expected `Option<String>`, found `&str`
   |
   = note:   expected enum `std::option::Option<std::string::String>`
           found reference `&str`

error[E0599]: no method named `is_some` found for struct `std::string::String` in the current scope
  --> src-tauri\src\tests\unit\task_creation_service_tests.rs:43:25
   |
43 |         assert!(task.id.is_some());
   |                         ^^^^^^^ method not found in `std::string::String`

error[E0599]: no method named `is_some` found for struct `std::string::String` in the current scope
  --> src-tauri\src\tests\unit\task_creation_service_tests.rs:44:34
   |
44 |         assert!(task.task_number.is_some());
   |                                  ^^^^^^^ method not found in `std::string::String`

error[E0308]: mismatched types
  --> src-tauri\src\tests\unit\task_creation_service_tests.rs:67:40
   |
67 |         assert_eq!(task.vehicle_plate, "");
   |                                        ^^ expected `Option<String>`, found `&str`
   |
   = note:   expected enum `std::option::Option<std::string::String>`
           found reference `&str`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
  --> src-tauri\src\tests\unit\task_creation_service_tests.rs:85:19
   |
85 |             error.contains("title") || error.contains("Title"),
   |                   ^^^^^^^^ method not found in `commands::errors::AppError`
   |
  ::: src-tauri\src\commands\errors.rs:11:1
   |
11 | pub enum AppError {
   | ----------------- method `contains` not found for this enum
   |
   = help: items from traits can only be used if the trait is implemented and in scope
   = note: the following traits define an item `contains`, perhaps you need to implement one of them:
           candidate #1: `Contains`
           candidate #2: `RangeBounds`
           candidate #3: `bitflags::traits::Flags`
           candidate #4: `clap_lex::OsStrExt`
           candidate #5: `ipnet::ipnet::Contains`
           candidate #6: `itertools::Itertools`
           candidate #7: `itertools::Itertools`
           candidate #8: `option_ext::OptionExt`
           candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
  --> src-tauri\src\tests\unit\task_creation_service_tests.rs:85:46
   |
85 |             error.contains("title") || error.contains("Title"),
   |                                              ^^^^^^^^ method not found in `commands::errors::AppError`
   |
  ::: src-tauri\src\commands\errors.rs:11:1
   |
11 | pub enum AppError {
   | ----------------- method `contains` not found for this enum
   |
   = help: items from traits can only be used if the trait is implemented and in scope
   = note: the following traits define an item `contains`, perhaps you need to implement one of them:
           candidate #1: `Contains`
           candidate #2: `RangeBounds`
           candidate #3: `bitflags::traits::Flags`
           candidate #4: `clap_lex::OsStrExt`
           candidate #5: `ipnet::ipnet::Contains`
           candidate #6: `itertools::Itertools`
           candidate #7: `itertools::Itertools`
           candidate #8: `option_ext::OptionExt`
           candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:106:19
    |
106 |             error.contains("ppf_zones") || error.contains("zone"),
    |                   ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:106:50
    |
106 |             error.contains("ppf_zones") || error.contains("zone"),
    |                                                  ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:127:19
    |
127 |             error.contains("ppf_zones") || error.contains("zone"),
    |                   ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:127:50
    |
127 |             error.contains("ppf_zones") || error.contains("zone"),
    |                                                  ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:148:19
    |
148 |             error.contains("vehicle_plate") || error.contains("plate"),
    |                   ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:148:54
    |
148 |             error.contains("vehicle_plate") || error.contains("plate"),
    |                                                      ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:169:19
    |
169 |             error.contains("email") || error.contains("Email"),
    |                   ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:169:46
    |
169 |             error.contains("email") || error.contains("Email"),
    |                                              ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0624]: method `generate_task_number` is private
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:180:35
    |
180 |             .map(|_| task_service.generate_task_number())
    |                                   ^^^^^^^^^^^^^^^^^^^^ private method
    |
   ::: src-tauri\src\services\task_creation.rs:304:5
    |
304 |     fn generate_task_number(&self) -> Result<String, AppError> {
    |     ---------------------------------------------------------- private method defined here

error[E0616]: field `db` of struct `task_creation::TaskCreationService` is private
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:221:14
    |
221 |             .db
    |              ^^ private field

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:275:19
    |
275 |             error.contains("client") || error.contains("Client"),
    |                   ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:275:47
    |
275 |             error.contains("client") || error.contains("Client"),
    |                                               ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0616]: field `db` of struct `task_creation::TaskCreationService` is private
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:287:14
    |
287 |             .db
    |              ^^ private field

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:341:19
    |
341 |             error.contains("technician") || error.contains("Technician"),
    |                   ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:341:51
    |
341 |             error.contains("technician") || error.contains("Technician"),
    |                                                   ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0616]: field `db` of struct `task_creation::TaskCreationService` is private
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:353:14
    |
353 |             .db
    |              ^^ private field

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:388:19
    |
388 |             error.contains("technician") || error.contains("banned"),
    |                   ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:388:51
    |
388 |             error.contains("technician") || error.contains("banned"),
    |                                                   ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:412:41
    |
412 |         assert_eq!(task.scheduled_date, future_date);
    |                                         ^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
412 |         assert_eq!(task.scheduled_date, Some(future_date));
    |                                         +++++           +

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:432:19
    |
432 |             error.contains("date") || error.contains("scheduled"),
    |                   ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:432:45
    |
432 |             error.contains("date") || error.contains("scheduled"),
    |                                             ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:455:19
    |
455 |             error.contains("date") || error.contains("scheduled"),
    |                   ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:455:45
    |
455 |             error.contains("date") || error.contains("scheduled"),
    |                                             ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:501:19
    |
501 |             error.contains("title") || error.contains("too long"),
    |                   ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `contains` found for enum `commands::errors::AppError` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:501:46
    |
501 |             error.contains("title") || error.contains("too long"),
    |                                              ^^^^^^^^ method not found in `commands::errors::AppError`
    |
   ::: src-tauri\src\commands\errors.rs:11:1
    |
 11 | pub enum AppError {
    | ----------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0599]: no method named `is_some` found for struct `std::string::String` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:536:34
    |
536 |         assert!(task.task_number.is_some(), "Should generate task number");
    |                                  ^^^^^^^ method not found in `std::string::String`

error[E0599]: no method named `clone` found for struct `task_creation::TaskCreationService` in the current scope
   --> src-tauri\src\tests\unit\task_creation_service_tests.rs:546:44
    |
546 |                 let service = task_service.clone(); // This would require Clone implementation
    |                                            ^^^^^ method not found in `task_creation::TaskCreationService`
    |
   ::: src-tauri\src\services\task_creation.rs:18:1
    |
 18 | pub struct TaskCreationService {
    | ------------------------------ method `clone` not found for this struct
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following trait defines an item `clone`, perhaps you need to implement it:
            candidate #1: `Clone`

error[E0308]: mismatched types
  --> src-tauri\src\tests\unit\task_creation_tests.rs:21:20
   |
21 |             title: "Test Task".to_string(),
   |                    ^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
   |
   = note: expected enum `std::option::Option<std::string::String>`
            found struct `std::string::String`
help: try wrapping the expression in `Some`
   |
21 |             title: Some("Test Task".to_string()),
   |                    +++++                       +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
  --> src-tauri\src\tests\unit\task_creation_tests.rs:20:23
   |
20 |         let request = CreateTaskRequest {
   |                       ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0599]: no method named `is_some` found for struct `std::string::String` in the current scope
  --> src-tauri\src\tests\unit\task_creation_tests.rs:62:25
   |
62 |         assert!(task.id.is_some());
   |                         ^^^^^^^ method not found in `std::string::String`

error[E0599]: no method named `is_some` found for struct `std::string::String` in the current scope
  --> src-tauri\src\tests\unit\task_creation_tests.rs:63:34
   |
63 |         assert!(task.task_number.is_some());
   |                                  ^^^^^^^ method not found in `std::string::String`

error[E0308]: mismatched types
  --> src-tauri\src\tests\unit\task_creation_tests.rs:72:20
   |
72 |             title: "Nouvelle tâche".to_string(), // Will be ignored as it's the default placeholder
   |                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
   |
   = note: expected enum `std::option::Option<std::string::String>`
            found struct `std::string::String`
help: try wrapping the expression in `Some`
   |
72 |             title: Some("Nouvelle tâche".to_string()), // Will be ignored as it's the default placeholder
   |                    +++++                            +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
  --> src-tauri\src\tests\unit\task_creation_tests.rs:71:23
   |
71 |         let request = CreateTaskRequest {
   |                       ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_tests.rs:116:20
    |
116 |             title: "Test Task".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
116 |             title: Some("Test Task".to_string()),
    |                    +++++                       +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_creation_tests.rs:115:23
    |
115 |         let request = CreateTaskRequest {
    |                       ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_tests.rs:164:20
    |
164 |             title: "Test Task".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
164 |             title: Some("Test Task".to_string()),
    |                    +++++                       +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_creation_tests.rs:163:23
    |
163 |         let request = CreateTaskRequest {
    |                       ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_tests.rs:212:20
    |
212 |             title: "Test Task".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
212 |             title: Some("Test Task".to_string()),
    |                    +++++                       +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_creation_tests.rs:211:23
    |
211 |         let request = CreateTaskRequest {
    |                       ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_tests.rs:260:20
    |
260 |             title: "Test Task".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
260 |             title: Some("Test Task".to_string()),
    |                    +++++                       +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_creation_tests.rs:259:23
    |
259 |         let request = CreateTaskRequest {
    |                       ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_tests.rs:311:97
    |
311 |             &[client_id.to_string(), "Test Client".to_string(), "test@example.com".to_string(), "0", "0"]
    |                                                                                                 ^^^ expected `String`, found `&str`
    |
help: try using a conversion method
    |
311 |             &[client_id.to_string(), "Test Client".to_string(), "test@example.com".to_string(), "0".to_string(), "0"]
    |                                                                                                    ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_tests.rs:315:20
    |
315 |             title: "Task with Client".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
315 |             title: Some("Task with Client".to_string()),
    |                    +++++                              +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_creation_tests.rs:314:23
    |
314 |         let request = CreateTaskRequest {
    |                       ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_tests.rs:360:20
    |
360 |             title: "Task with Invalid Client".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
360 |             title: Some("Task with Invalid Client".to_string()),
    |                    +++++                                      +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_creation_tests.rs:359:23
    |
359 |         let request = CreateTaskRequest {
    |                       ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_tests.rs:409:20
    |
409 |             title: "Task 1".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
409 |             title: Some("Task 1".to_string()),
    |                    +++++                    +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_creation_tests.rs:408:24
    |
408 |         let request1 = CreateTaskRequest {
    |                        ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_tests.rs:446:20
    |
446 |             title: "Task 2".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
446 |             title: Some("Task 2".to_string()),
    |                    +++++                    +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_creation_tests.rs:445:24
    |
445 |         let request2 = CreateTaskRequest {
    |                        ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_tests.rs:490:20
    |
490 |             title: "Test Task".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
490 |             title: Some("Test Task".to_string()),
    |                    +++++                       +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_creation_tests.rs:489:23
    |
489 |         let request = CreateTaskRequest {
    |                       ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_tests.rs:541:20
    |
541 |             title: "Test Task".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
541 |             title: Some("Test Task".to_string()),
    |                    +++++                       +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_creation_tests.rs:540:23
    |
540 |         let request = CreateTaskRequest {
    |                       ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_tests.rs:583:20
    |
583 |             title: "Test Task".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
583 |             title: Some("Test Task".to_string()),
    |                    +++++                       +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_creation_tests.rs:582:23
    |
582 |         let request = CreateTaskRequest {
    |                       ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_creation_tests.rs:625:20
    |
625 |             title: "Test Task".to_string(),
    |                    ^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
625 |             title: Some("Test Task".to_string()),
    |                    +++++                       +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_creation_tests.rs:624:23
    |
624 |         let request = CreateTaskRequest {
    |                       ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0599]: no method named `get_task_by_id_async` found for struct `task_crud::TaskCrudService` in the current scope
   --> src-tauri\src\tests\unit\task_crud_tests.rs:223:36
    |
223 |         let deleted_task = service.get_task_by_id_async(&created_task.id).await?;
    |                                    ^^^^^^^^^^^^^^^^^^^^ method not found in `task_crud::TaskCrudService`
    |
   ::: src-tauri\src\services\task_crud.rs:12:1
    |
 12 | pub struct TaskCrudService {
    | -------------------------- method `get_task_by_id_async` not found for this struct

error[E0599]: no method named `get_task_by_id_async` found for struct `task_crud::TaskCrudService` in the current scope
   --> src-tauri\src\tests\unit\task_crud_tests.rs:255:38
    |
255 |         let retrieved_task = service.get_task_by_id_async(&created_task.id).await?;
    |                                      ^^^^^^^^^^^^^^^^^^^^ method not found in `task_crud::TaskCrudService`
    |
   ::: src-tauri\src\services\task_crud.rs:12:1
    |
 12 | pub struct TaskCrudService {
    | -------------------------- method `get_task_by_id_async` not found for this struct

error[E0599]: no method named `get_task_by_id_async` found for struct `task_crud::TaskCrudService` in the current scope
   --> src-tauri\src\tests\unit\task_crud_tests.rs:271:38
    |
271 |         let retrieved_task = service.get_task_by_id_async("nonexistent-id").await?;
    |                                      ^^^^^^^^^^^^^^^^^^^^ method not found in `task_crud::TaskCrudService`
    |
   ::: src-tauri\src\services\task_crud.rs:12:1
    |
 12 | pub struct TaskCrudService {
    | -------------------------- method `get_task_by_id_async` not found for this struct

error[E0599]: no method named `list_tasks_async` found for struct `task_crud::TaskCrudService` in the current scope
   --> src-tauri\src\tests\unit\task_crud_tests.rs:282:29
    |
282 |         let tasks = service.list_tasks_async(10, 0).await?;
    |                             ^^^^^^^^^^^^^^^^ method not found in `task_crud::TaskCrudService`
    |
   ::: src-tauri\src\services\task_crud.rs:12:1
    |
 12 | pub struct TaskCrudService {
    | -------------------------- method `list_tasks_async` not found for this struct

error[E0599]: no method named `list_tasks_async` found for struct `task_crud::TaskCrudService` in the current scope
   --> src-tauri\src\tests\unit\task_crud_tests.rs:300:29
    |
300 |         let tasks = service.list_tasks_async(10, 0).await?;
    |                             ^^^^^^^^^^^^^^^^ method not found in `task_crud::TaskCrudService`
    |
   ::: src-tauri\src\services\task_crud.rs:12:1
    |
 12 | pub struct TaskCrudService {
    | -------------------------- method `list_tasks_async` not found for this struct

error[E0599]: no method named `list_tasks_async` found for struct `task_crud::TaskCrudService` in the current scope
   --> src-tauri\src\tests\unit\task_crud_tests.rs:304:35
    |
304 |         let tasks_page1 = service.list_tasks_async(2, 0).await?;
    |                                   ^^^^^^^^^^^^^^^^ method not found in `task_crud::TaskCrudService`
    |
   ::: src-tauri\src\services\task_crud.rs:12:1
    |
 12 | pub struct TaskCrudService {
    | -------------------------- method `list_tasks_async` not found for this struct

error[E0599]: no method named `list_tasks_async` found for struct `task_crud::TaskCrudService` in the current scope
   --> src-tauri\src\tests\unit\task_crud_tests.rs:305:35
    |
305 |         let tasks_page2 = service.list_tasks_async(2, 2).await?;
    |                                   ^^^^^^^^^^^^^^^^ method not found in `task_crud::TaskCrudService`
    |
   ::: src-tauri\src\services\task_crud.rs:12:1
    |
 12 | pub struct TaskCrudService {
    | -------------------------- method `list_tasks_async` not found for this struct

error[E0599]: no method named `search_tasks_async` found for struct `task_crud::TaskCrudService` in the current scope
   --> src-tauri\src\tests\unit\task_crud_tests.rs:336:31
    |
336 |         let results = service.search_tasks_async("Important", 10, 0).await?;
    |                               ^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\task_crud.rs:12:1
    |
 12 | pub struct TaskCrudService {
    | -------------------------- method `search_tasks_async` not found for this struct
    |
help: there is a method `create_task_async` with a similar name, but with different arguments
   --> src-tauri\src\services\task_crud.rs:23:5
    |
 23 | /     pub async fn create_task_async(
 24 | |         &self,
 25 | |         req: CreateTaskRequest,
 26 | |         user_id: &str,
 27 | |     ) -> Result<Task, AppError> {
    | |_______________________________^

error[E0599]: no function or associated item named `in_memory` found for struct `db::Database` in the current scope
   --> src-tauri\src\tests\unit\task_deletion_tests.rs:20:24
    |
 20 |     let db = Database::in_memory().expect("Failed to create in-memory database");
    |                        ^^^^^^^^^ function or associated item not found in `db::Database`
    |
   ::: src-tauri\src\db\mod.rs:98:1
    |
 98 | pub struct Database {
    | ------------------- function or associated item `in_memory` not found for this struct
    |
note: if you're trying to build a new `db::Database`, consider using `db::Database::new` which returns `Result<db::Database, std::string::String>`
   --> src-tauri\src\db\mod.rs:246:5
    |
246 |     pub fn new<P: AsRef<Path>>(path: P, encryption_key: &str) -> DbResult<Self> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
help: there is an associated function `new_in_memory` with a similar name
    |
 20 |     let db = Database::new_in_memory().expect("Failed to create in-memory database");
    |                        ++++

error[E0308]: mismatched types
  --> src-tauri\src\tests\unit\task_deletion_tests.rs:64:25
   |
64 |         scheduled_date: Some("2024-01-01".to_string()),
   |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `Option<String>`
   |
   = note: expected struct `std::string::String`
                found enum `std::option::Option<std::string::String>`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_deletion_tests.rs:80:20
    |
 80 |         tags: Some(vec!["test".to_string()]),
    |               ---- ^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `Vec<String>`
    |               |
    |               arguments to this enum variant are incorrect
    |
    = note: expected struct `std::string::String`
               found struct `Vec<std::string::String>`
help: the type constructed contains `Vec<std::string::String>` due to the type of the argument passed
   --> src-tauri\src\tests\unit\task_deletion_tests.rs:80:15
    |
 80 |         tags: Some(vec!["test".to_string()]),
    |               ^^^^^------------------------^
    |                    |
    |                    this argument influences the type of `Some`
note: tuple variant defined here
   --> C:\Users\emaMA\.rustup\toolchains\stable-x86_64-pc-windows-msvc\lib/rustlib/src/rust\library\core\src\option.rs:601:5
    |
601 |     Some(#[stable(feature = "rust1", since = "1.0.0")] T),
    |     ^^^^

error[E0063]: missing fields `created_by` and `creator_id` in initializer of `models::task::CreateTaskRequest`
  --> src-tauri\src\tests\unit\task_deletion_tests.rs:50:24
   |
50 |     let task_request = CreateTaskRequest {
   |                        ^^^^^^^^^^^^^^^^^ missing `created_by` and `creator_id`

error[E0308]: mismatched types
  --> src-tauri\src\tests\unit\task_update_tests.rs:20:20
   |
20 |             title: "Test Task".to_string(),
   |                    ^^^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
   |
   = note: expected enum `std::option::Option<std::string::String>`
            found struct `std::string::String`
help: try wrapping the expression in `Some`
   |
20 |             title: Some("Test Task".to_string()),
   |                    +++++                       +

error[E0063]: missing fields `created_by`, `creator_id` and `task_number` in initializer of `models::task::CreateTaskRequest`
  --> src-tauri\src\tests\unit\task_update_tests.rs:19:23
   |
19 |         let request = CreateTaskRequest {
   |                       ^^^^^^^^^^^^^^^^^ missing `created_by`, `creator_id` and `task_number`

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_update_tests.rs:252:97
    |
252 |             &[client_id.to_string(), "Test Client".to_string(), "test@example.com".to_string(), "0", "0"]
    |                                                                                                 ^^^ expected `String`, found `&str`
    |
help: try using a conversion method
    |
252 |             &[client_id.to_string(), "Test Client".to_string(), "test@example.com".to_string(), "0".to_string(), "0"]
    |                                                                                                    ++++++++++++

error[E0599]: no method named `validate_status_transition` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:27:41
    |
 27 |         let result = validation_service.validate_status_transition(&task, TaskStatus::Scheduled);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_status_transition` not found for this struct

error[E0599]: no method named `validate_status_transition` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:36:41
    |
 36 |         let result = validation_service.validate_status_transition(&task, TaskStatus::InProgress);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_status_transition` not found for this struct

error[E0599]: no method named `validate_status_transition` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:45:41
    |
 45 |         let result = validation_service.validate_status_transition(&task, TaskStatus::Completed);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_status_transition` not found for this struct

error[E0599]: no method named `validate_status_transition` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:54:41
    |
 54 |         let result = validation_service.validate_status_transition(&task, TaskStatus::Completed);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_status_transition` not found for this struct

error[E0599]: no method named `validate_status_transition` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:65:41
    |
 65 |         let result = validation_service.validate_status_transition(&task, TaskStatus::Draft);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_status_transition` not found for this struct

error[E0599]: no method named `validate_status_transition` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:91:45
    |
 91 |             let result = validation_service.validate_status_transition(&task, to_status);
    |                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_status_transition` not found for this struct

error[E0616]: field `db` of struct `task_validation::TaskValidationService` is private
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:109:14
    |
109 |             .db
    |              ^^ private field

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:129:79
    |
129 |         let result = validation_service.validate_technician_assignment(&task, Some(&technician_id));
    |                                         ------------------------------        ^^^^^^^^^^^^^^^^^^^^ expected `&Option<Vec<String>>`, found `Option<&String>`
    |                                         |
    |                                         arguments to this method are incorrect
    |
    = note: expected reference `&std::option::Option<Vec<std::string::String>>`
                    found enum `std::option::Option<&std::string::String>`
note: method defined here
   --> src-tauri\src\services\task_validation.rs:362:12
    |
362 |     pub fn validate_technician_assignment(
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
365 |         ppf_zones: &Option<Vec<String>>,
    |         -------------------------------

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:140:70
    |
140 |             validation_service.validate_technician_assignment(&task, Some(&nonexistent_id));
    |                                ------------------------------        ^^^^^^^^^^^^^^^^^^^^^ expected `&Option<Vec<String>>`, found `Option<&String>`
    |                                |
    |                                arguments to this method are incorrect
    |
    = note: expected reference `&std::option::Option<Vec<std::string::String>>`
                    found enum `std::option::Option<&std::string::String>`
note: method defined here
   --> src-tauri\src\services\task_validation.rs:362:12
    |
362 |     pub fn validate_technician_assignment(
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
365 |         ppf_zones: &Option<Vec<String>>,
    |         -------------------------------

error[E0616]: field `db` of struct `task_validation::TaskValidationService` is private
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:158:14
    |
158 |             .db
    |              ^^ private field

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:178:79
    |
178 |         let result = validation_service.validate_technician_assignment(&task, Some(&user_id));
    |                                         ------------------------------        ^^^^^^^^^^^^^^ expected `&Option<Vec<String>>`, found `Option<&String>`
    |                                         |
    |                                         arguments to this method are incorrect
    |
    = note: expected reference `&std::option::Option<Vec<std::string::String>>`
                    found enum `std::option::Option<&std::string::String>`
note: method defined here
   --> src-tauri\src\services\task_validation.rs:362:12
    |
362 |     pub fn validate_technician_assignment(
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
365 |         ppf_zones: &Option<Vec<String>>,
    |         -------------------------------

error[E0616]: field `db` of struct `task_validation::TaskValidationService` is private
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:195:14
    |
195 |             .db
    |              ^^ private field

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:216:79
    |
216 |         let result = validation_service.validate_technician_assignment(&task, Some(&technician_id));
    |                                         ------------------------------        ^^^^^^^^^^^^^^^^^^^^ expected `&Option<Vec<String>>`, found `Option<&String>`
    |                                         |
    |                                         arguments to this method are incorrect
    |
    = note: expected reference `&std::option::Option<Vec<std::string::String>>`
                    found enum `std::option::Option<&std::string::String>`
note: method defined here
   --> src-tauri\src\services\task_validation.rs:362:12
    |
362 |     pub fn validate_technician_assignment(
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
365 |         ppf_zones: &Option<Vec<String>>,
    |         -------------------------------

error[E0616]: field `db` of struct `task_validation::TaskValidationService` is private
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:232:14
    |
232 |             .db
    |              ^^ private field

error[E0624]: method `check_workload_capacity` is private
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:252:41
    |
252 |           let result = validation_service.check_workload_capacity(&technician_id);
    |                                           ^^^^^^^^^^^^^^^^^^^^^^^ private method
    |
   ::: src-tauri\src\services\task_validation.rs:466:5
    |
466 | /     fn check_workload_capacity(
467 | |         &self,
468 | |         user_id: &str,
469 | |         scheduled_date: &Option<String>,
470 | |     ) -> Result<bool, String> {
    | |_____________________________- private method defined here

error[E0616]: field `db` of struct `task_validation::TaskValidationService` is private
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:266:14
    |
266 |             .db
    |              ^^ private field

error[E0624]: method `check_workload_capacity` is private
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:307:41
    |
307 |           let result = validation_service.check_workload_capacity(&technician_id);
    |                                           ^^^^^^^^^^^^^^^^^^^^^^^ private method
    |
   ::: src-tauri\src\services\task_validation.rs:466:5
    |
466 | /     fn check_workload_capacity(
467 | |         &self,
468 | |         user_id: &str,
469 | |         scheduled_date: &Option<String>,
470 | |     ) -> Result<bool, String> {
    | |_____________________________- private method defined here

error[E0599]: no method named `validate_ppf_zones` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:321:41
    |
321 |         let result = validation_service.validate_ppf_zones(&task);
    |                                         ^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_ppf_zones` not found for this struct

error[E0599]: no method named `validate_ppf_zones` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:330:41
    |
330 |         let result = validation_service.validate_ppf_zones(&task);
    |                                         ^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_ppf_zones` not found for this struct

error[E0599]: no method named `validate_ppf_zones` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:341:41
    |
341 |         let result = validation_service.validate_ppf_zones(&task);
    |                                         ^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_ppf_zones` not found for this struct

error[E0599]: no method named `validate_ppf_zones` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:361:45
    |
361 |             let result = validation_service.validate_ppf_zones(&task);
    |                                             ^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_ppf_zones` not found for this struct

error[E0616]: field `db` of struct `task_validation::TaskValidationService` is private
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:377:14
    |
377 |             .db
    |              ^^ private field

error[E0599]: no method named `validate_task_comprehensive` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:409:41
    |
409 |         let result = validation_service.validate_task_comprehensive(&task);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_task_comprehensive` not found for this struct

error[E0599]: no method named `validate_task_comprehensive` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:428:41
    |
428 |         let result = validation_service.validate_task_comprehensive(&task);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_task_comprehensive` not found for this struct

error[E0599]: no method named `validate_task_comprehensive` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:455:41
    |
455 |         let result = validation_service.validate_task_comprehensive(&task);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_task_comprehensive` not found for this struct

error[E0599]: no method named `validate_task_comprehensive` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_service_tests.rs:463:41
    |
463 |         let result = validation_service.validate_task_comprehensive(&task);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_task_comprehensive` not found for this struct

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:25:30
    |
 25 |         let result = service.validate_create_task_request(&task_request)?;
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:38:30
    |
 38 |         let result = service.validate_create_task_request(&task_request).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:54:30
    |
 54 |         let result = service.validate_create_task_request(&task_request).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0308]: mismatched types
  --> src-tauri\src\tests\unit\task_validation_tests.rs:67:13
   |
67 |             "A".repeat(21), // Too long
   |             ^^^^^^^^^^^^^^ expected `&str`, found `String`
   |
help: consider borrowing here
   |
67 |             &"A".repeat(21), // Too long
   |             +

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:73:34
    |
 73 |             let result = service.validate_create_task_request(&task_request).unwrap();
    |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:97:34
    |
 97 |             let result = service.validate_create_task_request(&task_request).unwrap();
    |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:119:34
    |
119 |             let result = service.validate_create_task_request(&task_request).unwrap();
    |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:140:34
    |
140 |             let result = service.validate_create_task_request(&task_request)?;
    |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_validation_tests.rs:154:13
    |
154 |             "1".repeat(21),  // Too long
    |             ^^^^^^^^^^^^^^ expected `&str`, found `String`
    |
help: consider borrowing here
    |
154 |             &"1".repeat(21),  // Too long
    |             +

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:161:34
    |
161 |             let result = service.validate_create_task_request(&task_request).unwrap();
    |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:186:34
    |
186 |             let result = service.validate_create_task_request(&task_request)?;
    |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:199:30
    |
199 |         let result = service.validate_create_task_request(&task_request).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:215:30
    |
215 |         let result = service.validate_create_task_request(&task_request).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:230:30
    |
230 |         let result = service.validate_create_task_request(&task_request).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:242:30
    |
242 |         let result = service.validate_create_task_request(&task_request).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:260:30
    |
260 |         let result = service.validate_create_task_request(&task_request).unwrap();
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0308]: mismatched types
   --> src-tauri\src\tests\unit\task_validation_tests.rs:291:17
    |
291 |             id: "task-id".to_string(),
    |                 ^^^^^^^^^^^^^^^^^^^^^ expected `Option<String>`, found `String`
    |
    = note: expected enum `std::option::Option<std::string::String>`
             found struct `std::string::String`
help: try wrapping the expression in `Some`
    |
291 |             id: Some("task-id".to_string()),
    |                 +++++                     +

error[E0599]: no method named `validate_update_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:297:30
    |
297 |         let result = service.validate_update_task_request(&update_request, &created_task)?;
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_update_task_request` not found for this struct

error[E0599]: no method named `validate_status_transition` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:325:34
    |
325 |             let result = service.validate_status_transition(from_status, to_status)?;
    |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_status_transition` not found for this struct

error[E0599]: no method named `validate_status_transition` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:343:34
    |
343 |             let result = service.validate_status_transition(from_status, to_status)?;
    |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_status_transition` not found for this struct

error[E0599]: no method named `validate_create_task_request` found for struct `task_validation::TaskValidationService` in the current scope
   --> src-tauri\src\tests\unit\task_validation_tests.rs:377:30
    |
377 |         let result = service.validate_create_task_request(&task2_request)?;
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ method not found in `task_validation::TaskValidationService`
    |
   ::: src-tauri\src\services\task_validation.rs:137:1
    |
137 | pub struct TaskValidationService {
    | -------------------------------- method `validate_create_task_request` not found for this struct

error[E0609]: no field `id` on type `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_validation_tests.rs:592:63
    |
592 |         let task_id = TestDataFactory::create_test_task(None).id;
    |                                                               ^^ unknown field
    |
    = note: available fields are: `vehicle_plate`, `vehicle_model`, `ppf_zones`, `scheduled_date`, `external_id` ... and 28 others

error[E0609]: no field `id` on type `models::task::CreateTaskRequest`
   --> src-tauri\src\tests\unit\task_validation_tests.rs:621:63
    |
621 |         let task_id = TestDataFactory::create_test_task(None).id;
    |                                                               ^^ unknown field
    |
    = note: available fields are: `vehicle_plate`, `vehicle_model`, `ppf_zones`, `scheduled_date`, `external_id` ... and 28 others

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:29:24
    |
 29 |         assert!(result.is_ok(), "2FA setup generation should succeed");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
 29 |         assert!(result.await.is_ok(), "2FA setup generation should succeed");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
  --> src-tauri\src\tests\unit\two_factor_service_tests.rs:30:28
   |
30 |         let setup = result.unwrap();
   |                            ^^^^^^
   |
help: consider `await`ing on the `Future` and calling the method on its `Output`
   |
30 |         let setup = result.await.unwrap();
   |                            ++++++
help: there is a method `wrap` with a similar name
   |
30 -         let setup = result.unwrap();
30 +         let setup = result.wrap();
   |

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
  --> src-tauri\src\tests\unit\two_factor_service_tests.rs:67:14
   |
65 |           let setup1 = two_fa_service
   |  ______________________-
66 | |             .generate_setup(user_id1)
67 | |             .expect("Should generate first setup");
   | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>`
   | |_____________|
   |
   |
help: consider `await`ing on the `Future` and calling the method on its `Output`
   |
67 |             .await.expect("Should generate first setup");
   |              ++++++

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
  --> src-tauri\src\tests\unit\two_factor_service_tests.rs:70:14
   |
68 |           let setup2 = two_fa_service
   |  ______________________-
69 | |             .generate_setup(user_id2)
70 | |             .expect("Should generate second setup");
   | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>`
   | |_____________|
   |
   |
help: consider `await`ing on the `Future` and calling the method on its `Output`
   |
70 |             .await.expect("Should generate second setup");
   |              ++++++

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
  --> src-tauri\src\tests\unit\two_factor_service_tests.rs:94:14
   |
92 |           let setup = two_fa_service
   |  _____________________-
93 | |             .generate_setup(user_id)
94 | |             .expect("Should generate setup");
   | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>`
   | |_____________|
   |
   |
help: consider `await`ing on the `Future` and calling the method on its `Output`
   |
94 |             .await.expect("Should generate setup");
   |              ++++++

error[E0599]: no method named `save_secret` found for struct `two_factor::TwoFactorService` in the current scope
  --> src-tauri\src\tests\unit\two_factor_service_tests.rs:98:14
   |
97 | /         two_fa_service
98 | |             .save_secret(user_id, &setup.secret)
   | |             -^^^^^^^^^^^ method not found in `two_factor::TwoFactorService`
   | |_____________|
   |
   |
  ::: src-tauri\src\services\two_factor.rs:14:1
   |
14 |   pub struct TwoFactorService {
   |   --------------------------- method `save_secret` not found for this struct

error[E0599]: no method named `generate_current_code` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:103:14
    |
102 |           let valid_code = two_fa_service
    |  __________________________-
103 | |             .generate_current_code(&setup.secret)
    | |_____________-^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `generate_current_code` not found for this struct
    |
help: there is a method `generate_setup` with a similar name
    |
103 -             .generate_current_code(&setup.secret)
103 +             .generate_setup(&setup.secret)
    |

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:109:24
    |
109 |         assert!(result.is_ok(), "Valid TOTP code should verify successfully");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
109 |         assert!(result.await.is_ok(), "Valid TOTP code should verify successfully");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:110:24
    |
110 |         assert!(result.unwrap(), "Should return true for valid code");
    |                        ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
110 |         assert!(result.await.unwrap(), "Should return true for valid code");
    |                        ++++++
help: there is a method `wrap` with a similar name
    |
110 -         assert!(result.unwrap(), "Should return true for valid code");
110 +         assert!(result.wrap(), "Should return true for valid code");
    |

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:121:14
    |
119 |           let setup = two_fa_service
    |  _____________________-
120 | |             .generate_setup(user_id)
121 | |             .expect("Should generate setup");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
121 |             .await.expect("Should generate setup");
    |              ++++++

error[E0599]: no method named `save_secret` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:123:14
    |
122 | /         two_fa_service
123 | |             .save_secret(user_id, &setup.secret)
    | |             -^^^^^^^^^^^ method not found in `two_factor::TwoFactorService`
    | |_____________|
    |
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `save_secret` not found for this struct

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:129:24
    |
129 |         assert!(result.is_ok(), "Verification should not error");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
129 |         assert!(result.await.is_ok(), "Verification should not error");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:130:25
    |
130 |         assert!(!result.unwrap(), "Should return false for invalid code");
    |                         ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
130 |         assert!(!result.await.unwrap(), "Should return false for invalid code");
    |                         ++++++
help: there is a method `wrap` with a similar name
    |
130 -         assert!(!result.unwrap(), "Should return false for invalid code");
130 +         assert!(!result.wrap(), "Should return false for invalid code");
    |

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:141:24
    |
141 |         assert!(result.is_ok(), "Verification should not error");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
141 |         assert!(result.await.is_ok(), "Verification should not error");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:143:21
    |
143 |             !result.unwrap(),
    |                     ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
143 |             !result.await.unwrap(),
    |                     ++++++
help: there is a method `wrap` with a similar name
    |
143 -             !result.unwrap(),
143 +             !result.wrap(),
    |

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:156:14
    |
154 |           let setup = two_fa_service
    |  _____________________-
155 | |             .generate_setup(user_id)
156 | |             .expect("Should generate setup");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
156 |             .await.expect("Should generate setup");
    |              ++++++

error[E0599]: no method named `save_secret` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:158:14
    |
157 | /         two_fa_service
158 | |             .save_secret(user_id, &setup.secret)
    | |             -^^^^^^^^^^^ method not found in `two_factor::TwoFactorService`
    | |_____________|
    |
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `save_secret` not found for this struct

error[E0599]: no method named `generate_current_code` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:163:14
    |
162 |           let current_code = two_fa_service
    |  ____________________________-
163 | |             .generate_current_code(&setup.secret)
    | |_____________-^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `generate_current_code` not found for this struct
    |
help: there is a method `generate_setup` with a similar name
    |
163 -             .generate_current_code(&setup.secret)
163 +             .generate_setup(&setup.secret)
    |

error[E0599]: no method named `generate_code_for_time` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:168:14
    |
167 |           let previous_code = two_fa_service
    |  _____________________________-
168 | |             .generate_code_for_time(&setup.secret, chrono::Utc::now().timestamp() - 30)
    | |_____________-^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `generate_code_for_time` not found for this struct
    |
help: there is a method `generate_setup` with a similar name, but with different arguments
   --> src-tauri\src\services\two_factor.rs:30:5
    |
 30 |     pub async fn generate_setup(&self, user_id: &str) -> Result<TwoFactorSetup, AppError> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:171:24
    |
171 |         assert!(result.is_ok(), "Verification should not error");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
171 |         assert!(result.await.is_ok(), "Verification should not error");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:172:24
    |
172 |         assert!(result.unwrap(), "Should accept code from previous interval");
    |                        ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
172 |         assert!(result.await.unwrap(), "Should accept code from previous interval");
    |                        ++++++
help: there is a method `wrap` with a similar name
    |
172 -         assert!(result.unwrap(), "Should accept code from previous interval");
172 +         assert!(result.wrap(), "Should accept code from previous interval");
    |

error[E0599]: no method named `generate_code_for_time` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:176:14
    |
175 |           let future_code = two_fa_service
    |  ___________________________-
176 | |             .generate_code_for_time(&setup.secret, chrono::Utc::now().timestamp() + 30)
    | |_____________-^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `generate_code_for_time` not found for this struct
    |
help: there is a method `generate_setup` with a similar name, but with different arguments
   --> src-tauri\src\services\two_factor.rs:30:5
    |
 30 |     pub async fn generate_setup(&self, user_id: &str) -> Result<TwoFactorSetup, AppError> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:179:24
    |
179 |         assert!(result.is_ok(), "Verification should not error");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
179 |         assert!(result.await.is_ok(), "Verification should not error");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:180:24
    |
180 |         assert!(result.unwrap(), "Should accept code from next interval");
    |                        ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
180 |         assert!(result.await.unwrap(), "Should accept code from next interval");
    |                        ++++++
help: there is a method `wrap` with a similar name
    |
180 -         assert!(result.unwrap(), "Should accept code from next interval");
180 +         assert!(result.wrap(), "Should accept code from next interval");
    |

error[E0599]: no method named `generate_code_for_time` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:184:14
    |
183 |           let old_code = two_fa_service
    |  ________________________-
184 | |             .generate_code_for_time(&setup.secret, chrono::Utc::now().timestamp() - 120)
    | |_____________-^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `generate_code_for_time` not found for this struct
    |
help: there is a method `generate_setup` with a similar name, but with different arguments
   --> src-tauri\src\services\two_factor.rs:30:5
    |
 30 |     pub async fn generate_setup(&self, user_id: &str) -> Result<TwoFactorSetup, AppError> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:187:24
    |
187 |         assert!(result.is_ok(), "Verification should not error");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
187 |         assert!(result.await.is_ok(), "Verification should not error");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:189:21
    |
189 |             !result.unwrap(),
    |                     ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
189 |             !result.await.unwrap(),
    |                     ++++++
help: there is a method `wrap` with a similar name
    |
189 -             !result.unwrap(),
189 +             !result.wrap(),
    |

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:202:14
    |
200 |           let setup = two_fa_service
    |  _____________________-
201 | |             .generate_setup(user_id)
202 | |             .expect("Should generate setup");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
202 |             .await.expect("Should generate setup");
    |              ++++++

error[E0599]: no method named `save_backup_codes` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:204:14
    |
203 | /         two_fa_service
204 | |             .save_backup_codes(user_id, &setup.backup_codes)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `save_backup_codes` not found for this struct
    |
help: there is a method `regenerate_backup_codes` with a similar name, but with different arguments
   --> src-tauri\src\services\two_factor.rs:190:5
    |
190 |     pub async fn regenerate_backup_codes(&self, user_id: &str) -> Result<Vec<String>, AppError> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:211:24
    |
211 |         assert!(result.is_ok(), "Backup code verification should not error");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
211 |         assert!(result.await.is_ok(), "Backup code verification should not error");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:212:24
    |
212 |         assert!(result.unwrap(), "Should return true for valid backup code");
    |                        ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
212 |         assert!(result.await.unwrap(), "Should return true for valid backup code");
    |                        ++++++
help: there is a method `wrap` with a similar name
    |
212 -         assert!(result.unwrap(), "Should return true for valid backup code");
212 +         assert!(result.wrap(), "Should return true for valid backup code");
    |

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:216:24
    |
216 |         assert!(result.is_ok(), "Second verification should not error");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
216 |         assert!(result.await.is_ok(), "Second verification should not error");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:217:25
    |
217 |         assert!(!result.unwrap(), "Should return false for used backup code");
    |                         ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
217 |         assert!(!result.await.unwrap(), "Should return false for used backup code");
    |                         ++++++
help: there is a method `wrap` with a similar name
    |
217 -         assert!(!result.unwrap(), "Should return false for used backup code");
217 +         assert!(!result.wrap(), "Should return false for used backup code");
    |

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:228:14
    |
226 |           let setup = two_fa_service
    |  _____________________-
227 | |             .generate_setup(user_id)
228 | |             .expect("Should generate setup");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
228 |             .await.expect("Should generate setup");
    |              ++++++

error[E0599]: no method named `save_backup_codes` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:230:14
    |
229 | /         two_fa_service
230 | |             .save_backup_codes(user_id, &setup.backup_codes)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `save_backup_codes` not found for this struct
    |
help: there is a method `regenerate_backup_codes` with a similar name, but with different arguments
   --> src-tauri\src\services\two_factor.rs:190:5
    |
190 |     pub async fn regenerate_backup_codes(&self, user_id: &str) -> Result<Vec<String>, AppError> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:236:24
    |
236 |         assert!(result.is_ok(), "Backup code verification should not error");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
236 |         assert!(result.await.is_ok(), "Backup code verification should not error");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:238:21
    |
238 |             !result.unwrap(),
    |                     ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
238 |             !result.await.unwrap(),
    |                     ++++++
help: there is a method `wrap` with a similar name
    |
238 -             !result.unwrap(),
238 +             !result.wrap(),
    |

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:251:24
    |
251 |         assert!(result.is_ok(), "Backup code verification should not error");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
251 |         assert!(result.await.is_ok(), "Backup code verification should not error");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:253:21
    |
253 |             !result.unwrap(),
    |                     ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
253 |             !result.await.unwrap(),
    |                     ++++++
help: there is a method `wrap` with a similar name
    |
253 -             !result.unwrap(),
253 +             !result.wrap(),
    |

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:266:14
    |
264 |           let setup1 = two_fa_service
    |  ______________________-
265 | |             .generate_setup(user_id)
266 | |             .expect("Should generate first setup");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
266 |             .await.expect("Should generate first setup");
    |              ++++++

error[E0599]: no method named `save_backup_codes` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:268:14
    |
267 | /         two_fa_service
268 | |             .save_backup_codes(user_id, &setup1.backup_codes)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `save_backup_codes` not found for this struct
    |
help: there is a method `regenerate_backup_codes` with a similar name, but with different arguments
   --> src-tauri\src\services\two_factor.rs:190:5
    |
190 |     pub async fn regenerate_backup_codes(&self, user_id: &str) -> Result<Vec<String>, AppError> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:275:14
    |
273 | /         two_fa_service
274 | |             .verify_backup_code(user_id, used_code)
275 | |             .expect("Should consume one backup code");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<bool, commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
275 |             .await.expect("Should consume one backup code");
    |              ++++++

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<Vec<std::string::String>, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:280:24
    |
280 |         assert!(result.is_ok(), "Backup code regeneration should succeed");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
280 |         assert!(result.await.is_ok(), "Backup code regeneration should succeed");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<Vec<std::string::String>, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:281:39
    |
281 |         let new_backup_codes = result.unwrap();
    |                                       ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
281 |         let new_backup_codes = result.await.unwrap();
    |                                       ++++++
help: there is a method `wrap` with a similar name
    |
281 -         let new_backup_codes = result.unwrap();
281 +         let new_backup_codes = result.wrap();
    |

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:297:24
    |
297 |                 result.is_ok(),
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
297 |                 result.await.is_ok(),
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:301:25
    |
301 |                 !result.unwrap(),
    |                         ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
301 |                 !result.await.unwrap(),
    |                         ++++++
help: there is a method `wrap` with a similar name
    |
301 -                 !result.unwrap(),
301 +                 !result.wrap(),
    |

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:310:24
    |
310 |                 result.is_ok(),
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
310 |                 result.await.is_ok(),
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:313:28
    |
313 |             assert!(result.unwrap(), "New backup codes should be valid");
    |                            ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
313 |             assert!(result.await.unwrap(), "New backup codes should be valid");
    |                            ++++++
help: there is a method `wrap` with a similar name
    |
313 -             assert!(result.unwrap(), "New backup codes should be valid");
313 +             assert!(result.wrap(), "New backup codes should be valid");
    |

error[E0624]: method `encrypt_secret` is private
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:324:14
    |
324 |             .encrypt_secret(secret)
    |              ^^^^^^^^^^^^^^ private method
    |
   ::: src-tauri\src\services\two_factor.rs:317:5
    |
317 |     fn encrypt_secret(&self, secret: &[u8]) -> Result<Vec<u8>, AppError> {
    |     -------------------------------------------------------------------- private method defined here

error[E0624]: method `decrypt_secret` is private
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:338:14
    |
338 |             .decrypt_secret(&encrypted)
    |              ^^^^^^^^^^^^^^ private method
    |
   ::: src-tauri\src\services\two_factor.rs:329:5
    |
329 |     fn decrypt_secret(&self, encrypted_secret: &str) -> Result<Vec<u8>, AppError> {
    |     ----------------------------------------------------------------------------- private method defined here

error[E0624]: method `encrypt_secret` is private
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:351:14
    |
351 |             .encrypt_secret(secret)
    |              ^^^^^^^^^^^^^^ private method
    |
   ::: src-tauri\src\services\two_factor.rs:317:5
    |
317 |     fn encrypt_secret(&self, secret: &[u8]) -> Result<Vec<u8>, AppError> {
    |     -------------------------------------------------------------------- private method defined here

error[E0624]: method `encrypt_secret` is private
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:354:14
    |
354 |             .encrypt_secret(secret)
    |              ^^^^^^^^^^^^^^ private method
    |
   ::: src-tauri\src\services\two_factor.rs:317:5
    |
317 |     fn encrypt_secret(&self, secret: &[u8]) -> Result<Vec<u8>, AppError> {
    |     -------------------------------------------------------------------- private method defined here

error[E0624]: method `decrypt_secret` is private
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:371:37
    |
371 |         let result = two_fa_service.decrypt_secret(invalid_encrypted);
    |                                     ^^^^^^^^^^^^^^ private method
    |
   ::: src-tauri\src\services\two_factor.rs:329:5
    |
329 |     fn decrypt_secret(&self, encrypted_secret: &str) -> Result<Vec<u8>, AppError> {
    |     ----------------------------------------------------------------------------- private method defined here

error[E0599]: no method named `is_2fa_enabled` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:383:18
    |
382 |               !two_fa_service
    |  ______________-
383 | |                 .is_2fa_enabled(user_id)
    | |_________________-^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `is_2fa_enabled` not found for this struct
    |
help: there is a method `is_enabled` with a similar name
    |
383 -                 .is_2fa_enabled(user_id)
383 +                 .is_enabled(user_id)
    |

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:391:14
    |
389 |           let setup = two_fa_service
    |  _____________________-
390 | |             .generate_setup(user_id)
391 | |             .expect("Should generate setup");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
391 |             .await.expect("Should generate setup");
    |              ++++++

error[E0599]: no method named `save_secret` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:393:14
    |
392 | /         two_fa_service
393 | |             .save_secret(user_id, &setup.secret)
    | |             -^^^^^^^^^^^ method not found in `two_factor::TwoFactorService`
    | |_____________|
    |
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `save_secret` not found for this struct

error[E0599]: no method named `save_backup_codes` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:396:14
    |
395 | /         two_fa_service
396 | |             .save_backup_codes(user_id, &setup.backup_codes)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `save_backup_codes` not found for this struct
    |
help: there is a method `regenerate_backup_codes` with a similar name, but with different arguments
   --> src-tauri\src\services\two_factor.rs:190:5
    |
190 |     pub async fn regenerate_backup_codes(&self, user_id: &str) -> Result<Vec<String>, AppError> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0061]: this method takes 3 arguments but 1 argument was supplied
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:399:14
    |
399 |             .enable_2fa(user_id)
    |              ^^^^^^^^^^--------- two arguments of type `&str` and `Vec<std::string::String>` are missing
    |
note: method defined here
   --> src-tauri\src\services\two_factor.rs:72:18
    |
 72 |     pub async fn enable_2fa(
    |                  ^^^^^^^^^^
...
 75 |         verification_code: &str,
    |         -----------------------
 76 |         backup_codes: Vec<String>,
    |         -------------------------
help: provide the arguments
    |
399 |             .enable_2fa(user_id, /* &str */, /* Vec<std::string::String> */)
    |                                ++++++++++++++++++++++++++++++++++++++++++++

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<(), commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:400:14
    |
398 | /         two_fa_service
399 | |             .enable_2fa(user_id)
400 | |             .expect("Should enable 2FA");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<(), commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
400 |             .await.expect("Should enable 2FA");
    |              ++++++

error[E0599]: no method named `is_2fa_enabled` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:405:18
    |
404 | /             two_fa_service
405 | |                 .is_2fa_enabled(user_id)
    | |_________________-^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `is_2fa_enabled` not found for this struct
    |
help: there is a method `is_enabled` with a similar name
    |
405 -                 .is_2fa_enabled(user_id)
405 +                 .is_enabled(user_id)
    |

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<(), commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:413:14
    |
411 | /         two_fa_service
412 | |             .disable_2fa(user_id)
413 | |             .expect("Should disable 2FA");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<(), commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
413 |             .await.expect("Should disable 2FA");
    |              ++++++

error[E0599]: no method named `is_2fa_enabled` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:418:18
    |
417 |               !two_fa_service
    |  ______________-
418 | |                 .is_2fa_enabled(user_id)
    | |_________________-^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `is_2fa_enabled` not found for this struct
    |
help: there is a method `is_enabled` with a similar name
    |
418 -                 .is_2fa_enabled(user_id)
418 +                 .is_enabled(user_id)
    |

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:432:14
    |
430 |           let setup = two_fa_service
    |  _____________________-
431 | |             .generate_setup(user_id)
432 | |             .expect("Should generate setup");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
432 |             .await.expect("Should generate setup");
    |              ++++++

error[E0599]: no method named `save_backup_codes` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:434:14
    |
433 | /         two_fa_service
434 | |             .save_backup_codes(user_id, &setup.backup_codes)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `save_backup_codes` not found for this struct
    |
help: there is a method `regenerate_backup_codes` with a similar name, but with different arguments
   --> src-tauri\src\services\two_factor.rs:190:5
    |
190 |     pub async fn regenerate_backup_codes(&self, user_id: &str) -> Result<Vec<String>, AppError> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0061]: this method takes 3 arguments but 1 argument was supplied
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:437:14
    |
437 |             .enable_2fa(user_id)
    |              ^^^^^^^^^^--------- two arguments of type `&str` and `Vec<std::string::String>` are missing
    |
note: method defined here
   --> src-tauri\src\services\two_factor.rs:72:18
    |
 72 |     pub async fn enable_2fa(
    |                  ^^^^^^^^^^
...
 75 |         verification_code: &str,
    |         -----------------------
 76 |         backup_codes: Vec<String>,
    |         -------------------------
help: provide the arguments
    |
437 |             .enable_2fa(user_id, /* &str */, /* Vec<std::string::String> */)
    |                                ++++++++++++++++++++++++++++++++++++++++++++

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<(), commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:438:14
    |
436 | /         two_fa_service
437 | |             .enable_2fa(user_id)
438 | |             .expect("Should enable 2FA");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<(), commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
438 |             .await.expect("Should enable 2FA");
    |              ++++++

error[E0599]: no method named `get_remaining_backup_codes` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:442:14
    |
441 |           let remaining = two_fa_service
    |  _________________________-
442 | |             .get_remaining_backup_codes(user_id)
    | |_____________-^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `get_remaining_backup_codes` not found for this struct
    |
help: there is a method `verify_backup_code` with a similar name, but with different arguments
   --> src-tauri\src\services\two_factor.rs:168:5
    |
168 |     pub async fn verify_backup_code(&self, user_id: &str, code: &str) -> Result<bool, AppError> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:450:18
    |
448 | /             two_fa_service
449 | |                 .verify_backup_code(user_id, &setup.backup_codes[i])
450 | |                 .expect("Should use backup code");
    | |                 -^^^^^^ method not found in `impl futures::Future<Output = Result<bool, commands::errors::AppError>>`
    | |_________________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
450 |                 .await.expect("Should use backup code");
    |                  ++++++

error[E0599]: no method named `get_remaining_backup_codes` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:455:14
    |
454 |           let remaining = two_fa_service
    |  _________________________-
455 | |             .get_remaining_backup_codes(user_id)
    | |_____________-^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `get_remaining_backup_codes` not found for this struct
    |
help: there is a method `verify_backup_code` with a similar name, but with different arguments
   --> src-tauri\src\services\two_factor.rs:168:5
    |
168 |     pub async fn verify_backup_code(&self, user_id: &str, code: &str) -> Result<bool, AppError> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `is_err` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:466:24
    |
466 |         assert!(result.is_err(), "Should reject empty user ID");
    |                        ^^^^^^
    |
help: there is a method `inspect_err` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:493:5
    |
493 | /     fn inspect_err<F>(self, f: F) -> InspectErr<Self, F>
494 | |     where
495 | |         F: FnOnce(&Self::Error),
496 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
466 |         assert!(result.await.is_err(), "Should reject empty user ID");
    |                        ++++++

error[E0599]: no method named `is_2fa_enabled` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:468:37
    |
468 |         let result = two_fa_service.is_2fa_enabled("");
    |                                     ^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 | pub struct TwoFactorService {
    | --------------------------- method `is_2fa_enabled` not found for this struct
    |
help: there is a method `is_enabled` with a similar name
    |
468 -         let result = two_fa_service.is_2fa_enabled("");
468 +         let result = two_fa_service.is_enabled("");
    |

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:478:14
    |
476 |           let setup = two_fa_service
    |  _____________________-
477 | |             .generate_setup(user_id)
478 | |             .expect("Should generate setup");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
478 |             .await.expect("Should generate setup");
    |              ++++++

error[E0599]: no method named `save_secret` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:480:14
    |
479 | /         two_fa_service
480 | |             .save_secret(user_id, &setup.secret)
    | |             -^^^^^^^^^^^ method not found in `two_factor::TwoFactorService`
    | |_____________|
    |
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `save_secret` not found for this struct

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:484:24
    |
484 |         assert!(result.is_ok(), "Should handle empty code gracefully");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
484 |         assert!(result.await.is_ok(), "Should handle empty code gracefully");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:485:25
    |
485 |         assert!(!result.unwrap(), "Should reject empty code");
    |                         ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
485 |         assert!(!result.await.unwrap(), "Should reject empty code");
    |                         ++++++
help: there is a method `wrap` with a similar name
    |
485 -         assert!(!result.unwrap(), "Should reject empty code");
485 +         assert!(!result.wrap(), "Should reject empty code");
    |

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:488:24
    |
488 |         assert!(result.is_ok(), "Should handle non-numeric code gracefully");
    |                        ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
488 |         assert!(result.await.is_ok(), "Should handle non-numeric code gracefully");
    |                        ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:489:25
    |
489 |         assert!(!result.unwrap(), "Should reject non-numeric code");
    |                         ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
489 |         assert!(!result.await.unwrap(), "Should reject non-numeric code");
    |                         ++++++
help: there is a method `wrap` with a similar name
    |
489 -         assert!(!result.unwrap(), "Should reject non-numeric code");
489 +         assert!(!result.wrap(), "Should reject non-numeric code");
    |

error[E0599]: no method named `is_ok` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:494:20
    |
494 |             result.is_ok(),
    |                    ^^^^^
    |
help: there is a method `inspect_ok` with a similar name, but with different arguments
   --> C:\Users\emaMA\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\futures-util-0.3.31\src\future\try_future\mod.rs:467:5
    |
467 | /     fn inspect_ok<F>(self, f: F) -> InspectOk<Self, F>
468 | |     where
469 | |         F: FnOnce(&Self::Ok),
470 | |         Self: Sized,
    | |____________________^
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
494 |             result.await.is_ok(),
    |                    ++++++

error[E0599]: no method named `unwrap` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:498:21
    |
498 |             !result.unwrap(),
    |                     ^^^^^^
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
498 |             !result.await.unwrap(),
    |                     ++++++
help: there is a method `wrap` with a similar name
    |
498 -             !result.unwrap(),
498 +             !result.wrap(),
    |

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:511:14
    |
509 |           let setup = two_fa_service
    |  _____________________-
510 | |             .generate_setup(user_id)
511 | |             .expect("Should generate setup");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<TwoFactorSetup, commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
511 |             .await.expect("Should generate setup");
    |              ++++++

error[E0599]: no method named `save_secret` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:521:14
    |
520 | /         two_fa_service
521 | |             .save_secret(user_id, &setup.secret)
    | |             -^^^^^^^^^^^ method not found in `two_factor::TwoFactorService`
    | |_____________|
    |
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `save_secret` not found for this struct

error[E0599]: no method named `save_backup_codes` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:524:14
    |
523 | /         two_fa_service
524 | |             .save_backup_codes(user_id, &setup.backup_codes)
    | |_____________-^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `save_backup_codes` not found for this struct
    |
help: there is a method `regenerate_backup_codes` with a similar name, but with different arguments
   --> src-tauri\src\services\two_factor.rs:190:5
    |
190 |     pub async fn regenerate_backup_codes(&self, user_id: &str) -> Result<Vec<String>, AppError> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0061]: this method takes 3 arguments but 1 argument was supplied
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:527:14
    |
527 |             .enable_2fa(user_id)
    |              ^^^^^^^^^^--------- two arguments of type `&str` and `Vec<std::string::String>` are missing
    |
note: method defined here
   --> src-tauri\src\services\two_factor.rs:72:18
    |
 72 |     pub async fn enable_2fa(
    |                  ^^^^^^^^^^
...
 75 |         verification_code: &str,
    |         -----------------------
 76 |         backup_codes: Vec<String>,
    |         -------------------------
help: provide the arguments
    |
527 |             .enable_2fa(user_id, /* &str */, /* Vec<std::string::String> */)
    |                                ++++++++++++++++++++++++++++++++++++++++++++

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<(), commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:528:14
    |
526 | /         two_fa_service
527 | |             .enable_2fa(user_id)
528 | |             .expect("Should enable 2FA");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<(), commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
528 |             .await.expect("Should enable 2FA");
    |              ++++++

error[E0599]: no method named `is_2fa_enabled` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:533:18
    |
532 | /             two_fa_service
533 | |                 .is_2fa_enabled(user_id)
    | |_________________-^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `is_2fa_enabled` not found for this struct
    |
help: there is a method `is_enabled` with a similar name
    |
533 -                 .is_2fa_enabled(user_id)
533 +                 .is_enabled(user_id)
    |

error[E0599]: no method named `generate_current_code` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:540:14
    |
539 |           let valid_code = two_fa_service
    |  __________________________-
540 | |             .generate_current_code(&setup.secret)
    | |_____________-^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `generate_current_code` not found for this struct
    |
help: there is a method `generate_setup` with a similar name
    |
540 -             .generate_current_code(&setup.secret)
540 +             .generate_setup(&setup.secret)
    |

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:545:18
    |
543 | /             two_fa_service
544 | |                 .verify_code(user_id, &valid_code)
545 | |                 .expect("Should verify code"),
    | |                 -^^^^^^ method not found in `impl futures::Future<Output = Result<bool, commands::errors::AppError>>`
    | |_________________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
545 |                 .await.expect("Should verify code"),
    |                  ++++++

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:554:18
    |
552 | /             two_fa_service
553 | |                 .verify_backup_code(user_id, backup_code)
554 | |                 .expect("Should verify backup code"),
    | |                 -^^^^^^ method not found in `impl futures::Future<Output = Result<bool, commands::errors::AppError>>`
    | |_________________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
554 |                 .await.expect("Should verify backup code"),
    |                  ++++++

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<bool, commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:562:18
    |
560 |               !two_fa_service
    |  ______________-
561 | |                 .verify_backup_code(user_id, backup_code)
562 | |                 .expect("Should verify backup code"),
    | |                 -^^^^^^ method not found in `impl futures::Future<Output = Result<bool, commands::errors::AppError>>`
    | |_________________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
562 |                 .await.expect("Should verify backup code"),
    |                  ++++++

error[E0599]: no method named `get_remaining_backup_codes` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:568:14
    |
567 |           let remaining = two_fa_service
    |  _________________________-
568 | |             .get_remaining_backup_codes(user_id)
    | |_____________-^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `get_remaining_backup_codes` not found for this struct
    |
help: there is a method `verify_backup_code` with a similar name, but with different arguments
   --> src-tauri\src\services\two_factor.rs:168:5
    |
168 |     pub async fn verify_backup_code(&self, user_id: &str, code: &str) -> Result<bool, AppError> {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error[E0599]: no method named `expect` found for opaque type `impl futures::Future<Output = Result<(), commands::errors::AppError>>` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:579:14
    |
577 | /         two_fa_service
578 | |             .disable_2fa(user_id)
579 | |             .expect("Should disable 2FA");
    | |             -^^^^^^ method not found in `impl futures::Future<Output = Result<(), commands::errors::AppError>>`
    | |_____________|
    |
    |
help: consider `await`ing on the `Future` and calling the method on its `Output`
    |
579 |             .await.expect("Should disable 2FA");
    |              ++++++

error[E0599]: no method named `is_2fa_enabled` found for struct `two_factor::TwoFactorService` in the current scope
   --> src-tauri\src\tests\unit\two_factor_service_tests.rs:582:18
    |
581 |               !two_fa_service
    |  ______________-
582 | |                 .is_2fa_enabled(user_id)
    | |_________________-^^^^^^^^^^^^^^
    |
   ::: src-tauri\src\services\two_factor.rs:14:1
    |
 14 |   pub struct TwoFactorService {
    |   --------------------------- method `is_2fa_enabled` not found for this struct
    |
help: there is a method `is_enabled` with a similar name
    |
582 -                 .is_2fa_enabled(user_id)
582 +                 .is_enabled(user_id)
    |

error[E0599]: no method named `contains` found for enum `InterventionError` in the current scope
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:52:23
    |
 52 |         assert!(error.contains("Cannot transition from Completed to Pending"));
    |                       ^^^^^^^^ method not found in `InterventionError`
    |
   ::: src-tauri\src\db\mod.rs:131:1
    |
131 | pub enum InterventionError {
    | -------------------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0609]: no field `photos_taken` on type `step::InterventionStep`
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:109:14
    |
109 |         step.photos_taken = Some(1); // Only 1 photo, but 2 required
    |              ^^^^^^^^^^^^ unknown field
    |
    = note: available fields are: `id`, `intervention_id`, `step_number`, `step_name`, `step_type` ... and 38 others

error[E0599]: no method named `contains` found for enum `InterventionError` in the current scope
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:121:23
    |
121 |         assert!(error.contains("Required photos not uploaded"));
    |                       ^^^^^^^^ method not found in `InterventionError`
    |
   ::: src-tauri\src\db\mod.rs:131:1
    |
131 | pub enum InterventionError {
    | -------------------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0609]: no field `quality_checkpoints_validated` on type `step::InterventionStep`
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:134:14
    |
134 |         step.quality_checkpoints_validated = Some(vec!["surface_clean".to_string()]); // Missing "no_bubbles"
    |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ unknown field
    |
    = note: available fields are: `id`, `intervention_id`, `step_number`, `step_name`, `step_type` ... and 38 others

error[E0599]: no method named `contains` found for enum `InterventionError` in the current scope
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:147:23
    |
147 |         assert!(error.contains("Quality checkpoints not validated"));
    |                       ^^^^^^^^ method not found in `InterventionError`
    |
   ::: src-tauri\src\db\mod.rs:131:1
    |
131 | pub enum InterventionError {
    | -------------------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0616]: field `db` of struct `workflow_validation::WorkflowValidationService` is private
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:157:14
    |
157 |             .db
    |              ^^ private field

error[E0609]: no field `photos_taken` on type `step::InterventionStep`
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:165:18
    |
165 |             step.photos_taken = Some(2);
    |                  ^^^^^^^^^^^^ unknown field
    |
    = note: available fields are: `id`, `intervention_id`, `step_number`, `step_name`, `step_type` ... and 38 others

error[E0609]: no field `quality_checkpoints_validated` on type `step::InterventionStep`
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:166:18
    |
166 |             step.quality_checkpoints_validated = Some(vec!["surface_clean".to_string()]);
    |                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ unknown field
    |
    = note: available fields are: `id`, `intervention_id`, `step_number`, `step_name`, `step_type` ... and 38 others

error[E0609]: no field `name` on type `step::InterventionStep`
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:175:26
    |
175 |                     step.name,
    |                          ^^^^ unknown field
    |
    = note: available fields are: `id`, `intervention_id`, `step_number`, `step_name`, `step_type` ... and 38 others

error[E0061]: this method takes 2 arguments but 1 argument was supplied
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:190:41
    |
190 |         let result = validation_service.validate_intervention_finalization(&intervention);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^--------------- argument #2 of type `&RPMARequestLogger` is missing
    |
note: method defined here
   --> src-tauri\src\services\workflow_validation.rs:168:12
    |
168 |     pub fn validate_intervention_finalization(
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
171 |         logger: &RPMARequestLogger,
    |         --------------------------
help: provide the argument
    |
190 |         let result = validation_service.validate_intervention_finalization(&intervention, /* &RPMARequestLogger */);
    |                                                                                         ++++++++++++++++++++++++++

error[E0616]: field `db` of struct `workflow_validation::WorkflowValidationService` is private
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:204:14
    |
204 |             .db
    |              ^^ private field

error[E0061]: this method takes 2 arguments but 1 argument was supplied
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:246:41
    |
246 |         let result = validation_service.validate_intervention_finalization(&intervention);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^--------------- argument #2 of type `&RPMARequestLogger` is missing
    |
note: method defined here
   --> src-tauri\src\services\workflow_validation.rs:168:12
    |
168 |     pub fn validate_intervention_finalization(
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
171 |         logger: &RPMARequestLogger,
    |         --------------------------
help: provide the argument
    |
246 |         let result = validation_service.validate_intervention_finalization(&intervention, /* &RPMARequestLogger */);
    |                                                                                         ++++++++++++++++++++++++++

error[E0599]: no method named `contains` found for enum `InterventionError` in the current scope
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:252:23
    |
252 |         assert!(error.contains("Mandatory steps not completed"));
    |                       ^^^^^^^^ method not found in `InterventionError`
    |
   ::: src-tauri\src\db\mod.rs:131:1
    |
131 | pub enum InterventionError {
    | -------------------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0061]: this method takes 2 arguments but 1 argument was supplied
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:260:41
    |
260 |         let result = validation_service.validate_intervention_finalization(&intervention);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^--------------- argument #2 of type `&RPMARequestLogger` is missing
    |
note: method defined here
   --> src-tauri\src\services\workflow_validation.rs:168:12
    |
168 |     pub fn validate_intervention_finalization(
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
171 |         logger: &RPMARequestLogger,
    |         --------------------------
help: provide the argument
    |
260 |         let result = validation_service.validate_intervention_finalization(&intervention, /* &RPMARequestLogger */);
    |                                                                                         ++++++++++++++++++++++++++

error[E0599]: no method named `contains` found for enum `InterventionError` in the current scope
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:263:23
    |
263 |         assert!(error.contains("Only in-progress interventions can be finalized"));
    |                       ^^^^^^^^ method not found in `InterventionError`
    |
   ::: src-tauri\src\db\mod.rs:131:1
    |
131 | pub enum InterventionError {
    | -------------------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0616]: field `db` of struct `workflow_validation::WorkflowValidationService` is private
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:273:14
    |
273 |             .db
    |              ^^ private field

error[E0061]: this method takes 2 arguments but 1 argument was supplied
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:299:41
    |
299 |         let result = validation_service.validate_intervention_finalization(&intervention);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^--------------- argument #2 of type `&RPMARequestLogger` is missing
    |
note: method defined here
   --> src-tauri\src\services\workflow_validation.rs:168:12
    |
168 |     pub fn validate_intervention_finalization(
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
171 |         logger: &RPMARequestLogger,
    |         --------------------------
help: provide the argument
    |
299 |         let result = validation_service.validate_intervention_finalization(&intervention, /* &RPMARequestLogger */);
    |                                                                                         ++++++++++++++++++++++++++

error[E0599]: no method named `contains` found for enum `InterventionError` in the current scope
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:305:23
    |
305 |         assert!(error.contains("Quality score is required"));
    |                       ^^^^^^^^ method not found in `InterventionError`
    |
   ::: src-tauri\src\db\mod.rs:131:1
    |
131 | pub enum InterventionError {
    | -------------------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

error[E0609]: no field `photos_taken` on type `step::InterventionStep`
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:321:14
    |
321 |         step.photos_taken = Some(2);
    |              ^^^^^^^^^^^^ unknown field
    |
    = note: available fields are: `id`, `intervention_id`, `step_number`, `step_name`, `step_type` ... and 38 others

error[E0609]: no field `photos_taken` on type `step::InterventionStep`
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:330:14
    |
330 |         step.photos_taken = Some(6);
    |              ^^^^^^^^^^^^ unknown field
    |
    = note: available fields are: `id`, `intervention_id`, `step_number`, `step_name`, `step_type` ... and 38 others

error[E0609]: no field `photos_taken` on type `step::InterventionStep`
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:339:14
    |
339 |         step.photos_taken = Some(4);
    |              ^^^^^^^^^^^^ unknown field
    |
    = note: available fields are: `id`, `intervention_id`, `step_number`, `step_name`, `step_type` ... and 38 others

error[E0599]: no method named `set_timestamp` found for struct `common::TimestampString` in the current scope
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:361:14
    |
360 | /         step.started_at
361 | |             .set_timestamp(chrono::Utc::now().timestamp() - 200); // Only 200 seconds
    | |             -^^^^^^^^^^^^^ method not found in `common::TimestampString`
    | |_____________|
    |
    |
   ::: src-tauri\src\models\common.rs:221:1
    |
221 |   pub struct TimestampString(pub Option<i64>);
    |   -------------------------- method `set_timestamp` not found for this struct

error[E0599]: no method named `set_timestamp` found for struct `common::TimestampString` in the current scope
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:372:14
    |
371 | /         step.started_at
372 | |             .set_timestamp(chrono::Utc::now().timestamp() - 400); // 400 seconds
    | |             -^^^^^^^^^^^^^ method not found in `common::TimestampString`
    | |_____________|
    |
    |
   ::: src-tauri\src\models\common.rs:221:1
    |
221 |   pub struct TimestampString(pub Option<i64>);
    |   -------------------------- method `set_timestamp` not found for this struct

error[E0616]: field `db` of struct `workflow_validation::WorkflowValidationService` is private
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:397:14
    |
397 |             .db
    |              ^^ private field

error[E0609]: no field `photos_taken` on type `step::InterventionStep`
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:405:18
    |
405 |             step.photos_taken = Some(2);
    |                  ^^^^^^^^^^^^ unknown field
    |
    = note: available fields are: `id`, `intervention_id`, `step_number`, `step_name`, `step_type` ... and 38 others

error[E0609]: no field `quality_checkpoints_validated` on type `step::InterventionStep`
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:406:18
    |
406 |             step.quality_checkpoints_validated =
    |                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ unknown field
    |
    = note: available fields are: `id`, `intervention_id`, `step_number`, `step_name`, `step_type` ... and 38 others

error[E0609]: no field `name` on type `step::InterventionStep`
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:416:26
    |
416 |                     step.name,
    |                          ^^^^ unknown field
    |
    = note: available fields are: `id`, `intervention_id`, `step_number`, `step_name`, `step_type` ... and 38 others

error[E0061]: this method takes 2 arguments but 1 argument was supplied
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:431:41
    |
431 |         let result = validation_service.validate_intervention_finalization(&intervention);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^--------------- argument #2 of type `&RPMARequestLogger` is missing
    |
note: method defined here
   --> src-tauri\src\services\workflow_validation.rs:168:12
    |
168 |     pub fn validate_intervention_finalization(
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
171 |         logger: &RPMARequestLogger,
    |         --------------------------
help: provide the argument
    |
431 |         let result = validation_service.validate_intervention_finalization(&intervention, /* &RPMARequestLogger */);
    |                                                                                         ++++++++++++++++++++++++++

error[E0061]: this method takes 2 arguments but 1 argument was supplied
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:446:41
    |
446 |         let result = validation_service.validate_intervention_finalization(&intervention);
    |                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^--------------- argument #2 of type `&RPMARequestLogger` is missing
    |
note: method defined here
   --> src-tauri\src\services\workflow_validation.rs:168:12
    |
168 |     pub fn validate_intervention_finalization(
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
171 |         logger: &RPMARequestLogger,
    |         --------------------------
help: provide the argument
    |
446 |         let result = validation_service.validate_intervention_finalization(&intervention, /* &RPMARequestLogger */);
    |                                                                                         ++++++++++++++++++++++++++

error[E0599]: no method named `contains` found for enum `InterventionError` in the current scope
   --> src-tauri\src\tests\unit\workflow_validation_service_tests.rs:452:23
    |
452 |         assert!(error.contains("No steps found for intervention"));
    |                       ^^^^^^^^ method not found in `InterventionError`
    |
   ::: src-tauri\src\db\mod.rs:131:1
    |
131 | pub enum InterventionError {
    | -------------------------- method `contains` not found for this enum
    |
    = help: items from traits can only be used if the trait is implemented and in scope
    = note: the following traits define an item `contains`, perhaps you need to implement one of them:
            candidate #1: `Contains`
            candidate #2: `RangeBounds`
            candidate #3: `bitflags::traits::Flags`
            candidate #4: `clap_lex::OsStrExt`
            candidate #5: `ipnet::ipnet::Contains`
            candidate #6: `itertools::Itertools`
            candidate #7: `itertools::Itertools`
            candidate #8: `option_ext::OptionExt`
            candidate #9: `pom::set::Set`

warning: unused variable: `pool`
   --> src-tauri\src\worker_pool.rs:518:13
    |
518 |         let pool = manager.create_pool("test_pool", WorkerPoolConfig::default());
    |             ^^^^ help: if this is intentional, prefix it with an underscore: `_pool`

warning: variable does not need to be mutable
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:112:9
    |
112 |     let mut update_request = UpdateTaskRequest {
    |         ----^^^^^^^^^^^^^^
    |         |
    |         help: remove this `mut`
    |
    = note: `#[warn(unused_mut)]` on by default

warning: variable does not need to be mutable
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:125:9
    |
125 |     let mut reassign_request = UpdateTaskRequest {
    |         ----^^^^^^^^^^^^^^^^
    |         |
    |         help: remove this `mut`

warning: variable does not need to be mutable
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:135:9
    |
135 |     let mut complete_request = UpdateTaskRequest {
    |         ----^^^^^^^^^^^^^^^^
    |         |
    |         help: remove this `mut`

warning: unused variable: `validation_service`
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:200:9
    |
200 |     let validation_service = TaskValidationService::new(db.clone());
    |         ^^^^^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_validation_service`

warning: variable does not need to be mutable
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:210:9
    |
210 |     let mut invalid_assign_request = UpdateTaskRequest {
    |         ----^^^^^^^^^^^^^^^^^^^^^^
    |         |
    |         help: remove this `mut`

warning: variable does not need to be mutable
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:220:9
    |
220 |     let mut inactive_assign_request = UpdateTaskRequest {
    |         ----^^^^^^^^^^^^^^^^^^^^^^^
    |         |
    |         help: remove this `mut`

warning: variable does not need to be mutable
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:266:9
    |
266 |     let mut cancel_request = UpdateTaskRequest {
    |         ----^^^^^^^^^^^^^^
    |         |
    |         help: remove this `mut`

warning: variable does not need to be mutable
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:279:9
    |
279 |     let mut progress_request = UpdateTaskRequest {
    |         ----^^^^^^^^^^^^^^^^
    |         |
    |         help: remove this `mut`

warning: variable does not need to be mutable
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:289:9
    |
289 |     let mut scheduled_request = UpdateTaskRequest {
    |         ----^^^^^^^^^^^^^^^^^
    |         |
    |         help: remove this `mut`

warning: variable does not need to be mutable
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:302:9
    |
302 |     let mut complete_request = UpdateTaskRequest {
    |         ----^^^^^^^^^^^^^^^^
    |         |
    |         help: remove this `mut`

warning: variable does not need to be mutable
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:312:9
    |
312 |     let mut modify_request = UpdateTaskRequest {
    |         ----^^^^^^^^^^^^^^
    |         |
    |         help: remove this `mut`

warning: variable does not need to be mutable
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:385:9
    |
385 |     let mut update_request = UpdateTaskRequest {
    |         ----^^^^^^^^^^^^^^
    |         |
    |         help: remove this `mut`

warning: variable does not need to be mutable
   --> src-tauri\src\tests\integration\task_lifecycle_tests.rs:398:9
    |
398 |     let mut valid_update_request = UpdateTaskRequest {
    |         ----^^^^^^^^^^^^^^^^^^^^
    |         |
    |         help: remove this `mut`

error[E0308]: mismatched types
  --> src-tauri\src\tests\integration\session_repository_test.rs:42:28
   |
42 |             last_activity: chrono::Utc::now().timestamp(),
   |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
   |
help: try using a conversion method
   |
42 |             last_activity: chrono::Utc::now().timestamp().to_string(),
   |                                                          ++++++++++++

error[E0308]: mismatched types
  --> src-tauri\src\tests\integration\session_repository_test.rs:69:28
   |
69 |             last_activity: chrono::Utc::now().timestamp(),
   |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
   |
help: try using a conversion method
   |
69 |             last_activity: chrono::Utc::now().timestamp().to_string(),
   |                                                          ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:109:32
    |
109 |                 last_activity: chrono::Utc::now().timestamp(),
    |                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
109 |                 last_activity: chrono::Utc::now().timestamp().to_string(),
    |                                                              ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:144:28
    |
144 |             last_activity: chrono::Utc::now().timestamp() - 3600, // 1 hour ago
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
144 |             last_activity: (chrono::Utc::now().timestamp() - 3600).to_string(), // 1 hour ago
    |                            +                                     +++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:177:28
    |
177 |             last_activity: chrono::Utc::now().timestamp() - 3600,
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
177 |             last_activity: (chrono::Utc::now().timestamp() - 3600).to_string(),
    |                            +                                     +++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:212:28
    |
212 |             last_activity: chrono::Utc::now().timestamp(),
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
212 |             last_activity: chrono::Utc::now().timestamp().to_string(),
    |                                                          ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:246:36
    |
246 |                     last_activity: chrono::Utc::now().timestamp(),
    |                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
246 |                     last_activity: chrono::Utc::now().timestamp().to_string(),
    |                                                                  ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:293:32
    |
293 |                 last_activity: chrono::Utc::now().timestamp() - 7200,
    |                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
293 |                 last_activity: (chrono::Utc::now().timestamp() - 7200).to_string(),
    |                                +                                     +++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:308:32
    |
308 |                 last_activity: chrono::Utc::now().timestamp(),
    |                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
308 |                 last_activity: chrono::Utc::now().timestamp().to_string(),
    |                                                              ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:356:32
    |
356 |                 last_activity: now.timestamp(),
    |                                ^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
356 |                 last_activity: now.timestamp().to_string(),
    |                                               ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:372:32
    |
372 |                 last_activity: now.timestamp(),
    |                                ^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
372 |                 last_activity: now.timestamp().to_string(),
    |                                               ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:387:28
    |
387 |             last_activity: now.timestamp(),
    |                            ^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
387 |             last_activity: now.timestamp().to_string(),
    |                                           ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:420:40
    |
420 |                         last_activity: chrono::Utc::now().timestamp(),
    |                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
420 |                         last_activity: chrono::Utc::now().timestamp().to_string(),
    |                                                                      ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:464:28
    |
464 |             last_activity: chrono::Utc::now().timestamp(),
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
464 |             last_activity: chrono::Utc::now().timestamp().to_string(),
    |                                                          ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:515:28
    |
515 |             last_activity: chrono::Utc::now().timestamp(),
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
515 |             last_activity: chrono::Utc::now().timestamp().to_string(),
    |                                                          ++++++++++++

error[E0308]: mismatched types
   --> src-tauri\src\tests\integration\session_repository_test.rs:536:28
    |
536 |             last_activity: chrono::Utc::now().timestamp(),
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ expected `String`, found `i64`
    |
help: try using a conversion method
    |
536 |             last_activity: chrono::Utc::now().timestamp().to_string(),
    |                                                          ++++++++++++

Some errors have detailed explanations: E0061, E0063, E0255, E0277, E0308, E0364, E0412, E0422, E0425...
For more information about an error, try `rustc --explain E0061`.
warning: `rpma-ppf-intervention` (lib test) generated 78 warnings (22 duplicates)
error: could not compile `rpma-ppf-intervention` (lib test) due to 1038 previous errors; 78 warnings emitted

emaMA@LAPTOP-76DN517M MINGW64 /d/rpma-rust/src-tauri (Feat/tests)
$
