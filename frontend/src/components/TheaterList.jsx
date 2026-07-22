import React, { useState, useEffect } from 'react';
import theaterService from '../services/theaterService'; // Import file service vừa tạo

const CITIES = [
  "Hồ Chí Minh",
  "Hà Nội",
  "Đà Nẵng",
  "Bình Dương",
  "Đồng Nai"
];

const TheaterPage = () => {
  const [selectedCity, setSelectedCity] = useState("Hồ Chí Minh");
  const [theaters, setTheaters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTheater, setSelectedTheater] = useState(null);

  // Gọi API mỗi khi selectedCity thay đổi
  useEffect(() => {
    const fetchTheaters = async () => {
      setLoading(true);
      try {
        // Tự động gọi /api/theaters?city=...
        const data = await theaterService.getActiveTheaters(selectedCity);
        setTheaters(data || []);
      } catch (error) {
        console.error("Lỗi lấy danh sách rạp:", error);
        setTheaters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTheaters();
  }, [selectedCity]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* CỘT BÊN TRÁI: Thanh cào cuộn lọc rạp chuẩn Google Maps */}
      <div style={{
        width: '380px',
        height: '100%',
        backgroundColor: '#fff',
        borderRight: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 10px rgba(0,0,0,0.05)',
        zIndex: 10
      }}>
        
        {/* TẦNG 1: Chọn Tỉnh/Thành (Cố định ở trên) */}
        <div style={{ padding: '20px 16px 16px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '600', color: '#1a1a1a' }}>
            Tìm rạp chiếu phim
          </h2>
          <select 
            value={selectedCity} 
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #d9d9d9',
              outline: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: '#f9f9f9'
            }}
          >
            {CITIES.map(city => (
              <option key={city} value={city}>📍 {city}</option>
            ))}
          </select>
        </div>

        {/* TẦNG 2: Danh sách rạp (Cuộn độc lập) */}
        <div 
          className="custom-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto', // Đòn quyết định tạo thanh cuộn độc lập
            padding: '8px 0'
          }}
        >
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#8c8c8c' }}>
              Đang tải danh sách rạp...
            </div>
          ) : theaters.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#8c8c8c' }}>
              Không có rạp nào tại khu vực này.
            </div>
          ) : (
            theaters.map((theater) => {
              const isSelected = selectedTheater?.id === theater.id;
              return (
                <div 
                  key={theater.id}
                  onClick={() => setSelectedTheater(theater)}
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f5f5f5',
                    backgroundColor: isSelected ? '#e6f7ff' : '#ffffff',
                    borderLeft: isSelected ? '4px solid #1890ff' : '4px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#1890ff' }}>
                    {theater.name}
                  </h3>
                  <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#595959', lineHeight: '1.4' }}>
                    🏠 {theater.address}
                  </p>
                  {theater.phoneNumber && (
                    <p style={{ margin: 0, fontSize: '12px', color: '#8c8c8c' }}>
                      📞 {theater.phoneNumber}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CỘT BÊN PHẢI: Khung hiển thị Bản đồ / Chi tiết rạp */}
      <div style={{ flex: 1, backgroundColor: '#f5f5f5', padding: '24px' }}>
        {selectedTheater ? (
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', height: '100%' }}>
            <h2>{selectedTheater.name}</h2>
            <p><strong>Địa chỉ:</strong> {selectedTheater.address}</p>
            <p><strong>Thành phố:</strong> {selectedTheater.city}</p>
            <p><strong>Điện thoại:</strong> {selectedTheater.phoneNumber}</p>
            {/* Về sau bạn nhúng Google Maps iFrame hoặc chọn suất chiếu ở đây */}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8c8c8c' }}>
            Vui lòng chọn 1 rạp bên trái để xem thông tin chi tiết
          </div>
        )}
      </div>

    </div>
  );
};

export default TheaterPage;