import { Box, CssBaseline, Paper, ThemeProvider } from '@mui/material';
import LocalActivityRoundedIcon from '@mui/icons-material/LocalActivityRounded';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import { cinemaTheme as authTheme } from '../theme/cinemaTheme';
import './AuthLayout.css';

const AuthLayout = ({ children, maxFormWidth = 460, mode = 'login' }) => {
  const isRegister = mode === 'register';

  return (
    <ThemeProvider theme={authTheme}>
      <CssBaseline />
      <main className={`auth-page auth-page--${mode}`}>
        <div className="auth-page__ambient auth-page__ambient--one" />
        <div className="auth-page__ambient auth-page__ambient--two" />

        <section className="auth-shell">
          <aside className="auth-story">
            <div className="auth-story__backdrop" />
            <div className="auth-story__shade" />

            <a className="auth-story__brand" href="/" aria-label="Về trang chủ ThauFilm">
              <img src="/logo-removebg-preview.png" alt="" />
              <span>ThauFilm</span>
            </a>

            <div className="auth-story__content">
              <span className="auth-story__eyebrow">
                {isRegister ? 'GIA NHẬP CỘNG ĐỒNG ĐIỆN ẢNH' : 'RẠP PHIM TRONG TẦM TAY'}
              </span>
              <h1 className="auth-story__title">
                {isRegister
                  ? (
                    <>
                      <span>Mỗi bộ phim hay</span>
                      <span>bắt đầu từ</span>
                      <span className="auth-story__title-accent">một tấm vé.</span>
                    </>
                  )
                  : (
                    <>
                      <span>Trở lại với</span>
                      <span className="auth-story__title-accent">thế giới điện ảnh</span>
                      <span>của riêng bạn.</span>
                    </>
                  )}
              </h1>
              <p>
                {isRegister
                  ? 'Tạo tài khoản để giữ chỗ, nhận ưu đãi và lưu lại mọi hành trình điện ảnh tại ThauFilm.'
                  : 'Đăng nhập để tiếp tục đặt vé, quản lý lịch xem và khám phá những câu chuyện đang chờ bạn.'}
              </p>

              <div className="auth-story__features">
                <span><LocalActivityRoundedIcon /> Đặt vé nhanh</span>
                <span><PlayCircleOutlineRoundedIcon /> Xem trailer</span>
                <span><StarsRoundedIcon /> Ưu đãi thành viên</span>
              </div>
            </div>

            <div className="auth-story__filmstrip" aria-hidden="true">
              <span /><span /><span /><span /><span /><span />
            </div>
          </aside>

          <Box className="auth-form-zone">
            <Paper
              className="auth-form-card"
              elevation={0}
              sx={{ maxWidth: maxFormWidth }}
            >
              {children}
            </Paper>
          </Box>
        </section>
      </main>
    </ThemeProvider>
  );
};

export default AuthLayout;
