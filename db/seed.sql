-- NafuPlanner baslangic verileri
-- Rozet katalogu (global). Kategoriler grup olusturulurken uygulama tarafinda tohumlanir.
-- Kurulum: semadan sonra calistir.

INSERT INTO np_badges (code, name, description, icon, threshold_type, threshold_value) VALUES
  ('first_task',     'Ilk Adim',       'Ilk gorevini tamamladin.',                       'sparkles',     'tasks_completed', 1),
  ('ten_tasks',      'Duzen Geliyor',  '10 gorev tamamlandi.',                           'check-check',  'tasks_completed', 10),
  ('fifty_tasks',    'Ev Kahramani',   '50 gorev tamamlandi.',                           'medal',        'tasks_completed', 50),
  ('hundred_tasks',  'Yuz Yuze',       '100 gorev tamamlandi.',                          'trophy',       'tasks_completed', 100),
  ('streak_3',       'Uc Gun Ust Uste','3 gun ust uste gorev tamamladin.',               'flame',        'streak_days',     3),
  ('streak_7',       'Tam Bir Hafta',  '7 gun kesintisiz seri.',                         'flame',        'streak_days',     7),
  ('streak_30',      'Bir Ay Boyunca', '30 gunluk seri. Inanilmaz.',                     'flame',        'streak_days',     30),
  ('points_100',     'Yuz Puan',       'Toplam 100 puana ulastin.',                      'star',         'points_total',    100),
  ('points_500',     'Bes Yuz Puan',   'Toplam 500 puan. Vazgecilmezsin.',               'star',         'points_total',    500),
  ('early_bird',     'Erken Kalkan',   'Bir gorevi son tarihinden cok once bitirdin.',   'sunrise',      'early_complete',  1),
  ('zero_backlog',   'Sifir Birikim',  'Geciken hicbir isin kalmadigi bir hafta.',       'sparkle',      'zero_overdue',    7)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  icon = VALUES(icon),
  threshold_type = VALUES(threshold_type),
  threshold_value = VALUES(threshold_value);
