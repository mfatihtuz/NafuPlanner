-- NafuPlanner baslangic verileri
-- Rozet katalogu (global). Kategoriler grup olusturulurken uygulama tarafinda tohumlanir.
-- Kurulum: semadan sonra calistir.

INSERT INTO np_badges (code, name, description, icon, threshold_type, threshold_value) VALUES
  ('first_task',     'İlk Adım',       'İlk görevini tamamladın.',                       'sparkles',     'tasks_completed', 1),
  ('ten_tasks',      'Düzen Geliyor',  '10 görev tamamlandı.',                           'check-check',  'tasks_completed', 10),
  ('fifty_tasks',    'Ev Kahramanı',   '50 görev tamamlandı.',                           'medal',        'tasks_completed', 50),
  ('hundred_tasks',  'Yüz Yüze',       '100 görev tamamlandı.',                          'trophy',       'tasks_completed', 100),
  ('streak_3',       'Üç Gün Üst Üste','3 gün üst üste görev tamamladın.',               'flame',        'streak_days',     3),
  ('streak_7',       'Tam Bir Hafta',  '7 gün kesintisiz seri.',                         'flame',        'streak_days',     7),
  ('streak_30',      'Bir Ay Boyunca', '30 günlük seri. İnanılmaz.',                     'flame',        'streak_days',     30),
  ('points_100',     'Yüz Puan',       'Toplam 100 puana ulaştın.',                      'star',         'points_total',    100),
  ('points_500',     'Beş Yüz Puan',   'Toplam 500 puan. Vazgeçilmezsin.',               'star',         'points_total',    500),
  ('early_bird',     'Erken Kalkan',   'Bir görevi son tarihinden çok önce bitirdin.',   'sunrise',      'early_complete',  1),
  ('zero_backlog',   'Sıfır Birikim',  'Geciken hiçbir işin kalmadığı bir hafta.',       'sparkle',      'zero_overdue',    7)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  icon = VALUES(icon),
  threshold_type = VALUES(threshold_type),
  threshold_value = VALUES(threshold_value);
