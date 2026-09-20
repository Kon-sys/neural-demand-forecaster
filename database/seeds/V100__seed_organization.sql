INSERT INTO departments (
    name,
    is_active
)
VALUES
    ('Отдел разработки', TRUE),
    ('Отдел аналитики', TRUE),
    ('Отдел маркетинга', TRUE)
ON CONFLICT DO NOTHING;


INSERT INTO positions (
    department_id,
    name,
    is_active
)
SELECT
    d.id,
    p.name,
    TRUE
FROM (
         VALUES
             ('Отдел разработки', 'Junior Developer'),
             ('Отдел разработки', 'Middle Developer'),
             ('Отдел разработки', 'Senior Developer'),

             ('Отдел аналитики', 'Data Analyst'),
             ('Отдел аналитики', 'Data Scientist'),

             ('Отдел маркетинга', 'Marketing Specialist'),
             ('Отдел маркетинга', 'Marketing Manager')
     ) AS p(department_name, name)
         JOIN departments d
              ON LOWER(d.name) = LOWER(p.department_name)
ON CONFLICT DO NOTHING;