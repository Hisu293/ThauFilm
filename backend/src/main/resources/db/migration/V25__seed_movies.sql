-- V25: Seed data for movies
INSERT INTO movies (id, title, description, duration_minutes, rating, active, poster_url, director, actors, genre, release_date, language, rated, status) VALUES
('a0000001-0000-0000-0000-000000000001', 'Avatar: The Way of Water', 
 'Phần tiếp theo của Avatar, cuộc phiêu lưu của Jake Sully và Neytiri trong thế giới Pandora.', 
 192, 8.50, true, 'https://example.com/avatar2.jpg', 'James Cameron', 'Sam Worthington, Zoe Saldana', 
 'Sci-Fi, Adventure', '2022-12-16', 'English', 'PG-13', 'NOW_SHOWING'),

('a0000002-0000-0000-0000-000000000002', 'Oppenheimer', 
 'Câu chuyện về J. Robert Oppenheimer và việc chế tạo bom nguyên tử.', 
 180, 9.00, true, 'https://example.com/oppenheimer.jpg', 'Christopher Nolan', 
 'Cillian Murphy, Emily Blunt', 'Drama, History', '2023-07-21', 'English', 'R', 'NOW_SHOWING'),

('a0000003-0000-0000-0000-000000000003', 'Dune: Part Two', 
 'Paul Atreides hợp nhất với Chani và người Fremen trong cuộc chiến chống lại House Harkonnen.', 
 166, 8.80, true, 'https://example.com/dune2.jpg', 'Denis Villeneuve', 
 'Timothée Chalamet, Zendaya', 'Sci-Fi, Adventure', '2024-03-01', 'English', 'PG-13', 'NOW_SHOWING'),

('a0000004-0000-0000-0000-000000000004', 'Wonka', 
 'Câu chuyện gốc về Willy Wonka và những điều kỳ diệu của chocolate.', 
 116, 7.50, true, 'https://example.com/wonka.jpg', 'Paul King', 
 'Timothée Chalamet', 'Comedy, Fantasy', '2023-12-15', 'English', 'PG', 'NOW_SHOWING'),

('a0000005-0000-0000-0000-000000000005', 'Godzilla x Kong: The New Empire', 
 'Hai Titan huyền thoại hợp nhất để chống lại một mối đe dọa khổng lồ ẩn trong Trái Đất.', 
 115, 7.20, true, 'https://example.com/godzilla.jpg', 'Adam Wingard', 
 'Rebecca Hall, Brian Tyree Henry', 'Action, Sci-Fi', '2024-03-29', 'English', 'PG-13', 'NOW_SHOWING'),

('a0000006-0000-0000-0000-000000000006', 'Inside Out 2', 
 'Phần tiếp theo của Inside Out, Riley đối mặt với những cảm xúc mới khi bước vào tuổi dậy thì.', 
 96, 8.20, true, 'https://example.com/insideout2.jpg', 'Kelsey Mann', 
 'Amy Poehler, Maya Hawke', 'Animation, Family', '2024-06-14', 'English', 'PG', 'NOW_SHOWING'),

('a0000007-0000-0000-0000-000000000007', 'Deadpool & Wolverine', 
 'Deadpool sử dụng Wolverine để cứu thế giới của mình.', 
 127, 8.50, true, 'https://example.com/deadpool3.jpg', 'Shawn Levy', 
 'Ryan Reynolds, Hugh Jackman', 'Action, Comedy', '2024-07-26', 'English', 'R', 'NOW_SHOWING'),

('a0000008-0000-0000-0000-000000000008', 'Moana 2', 
 'Moana tiếp tục hành trình khám phá đại dương với những người bạn mới.', 
 100, 8.00, true, 'https://example.com/moana2.jpg', 'David Derrick Jr.', 
 'Auliʻi Cravalho, Dwayne Johnson', 'Animation, Adventure', '2024-11-27', 'English', 'PG', 'COMING_SOON')
ON CONFLICT (title) DO NOTHING;
