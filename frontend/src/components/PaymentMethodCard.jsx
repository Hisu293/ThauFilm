import { Card, CardContent, Typography, Box, Stack, Radio } from '@mui/material';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';

const METHODS = [
  {
    id: 'bank_card',
    title: 'Thẻ ngân hàng (ATM / Visa / Mastercard)',
    description: 'Thanh toán qua cổng thẻ nội địa hoặc quốc tế',
    icon: CreditCardRoundedIcon,
    color: '#3B82F6'
  },
  {
    id: 'e_wallet',
    title: 'Ví điện tử (Momo / ZaloPay / ShopeePay)',
    description: 'Mở ứng dụng ví điện tử quét mã thanh toán tiện lợi',
    icon: AccountBalanceWalletRoundedIcon,
    color: '#EC4899'
  },
  {
    id: 'qr_pay',
    title: 'Quét mã QR (VNPAY-QR / VietQR)',
    description: 'Sử dụng ứng dụng Mobile Banking quét mã chuyển khoản nhanh',
    icon: QrCode2RoundedIcon,
    color: '#10B981'
  }
];

export const PaymentMethodCard = ({ selectedMethodId, onSelectMethod }) => {
  return (
    <Stack spacing={2}>
      {METHODS.map((method) => {
        const IconComponent = method.icon;
        const isSelected = selectedMethodId === method.id;

        return (
          <Card
            key={method.id}
            onClick={() => onSelectMethod(method.id)}
            sx={{
              cursor: 'pointer',
              border: isSelected 
                ? '2px solid #FBBF24' 
                : '1.5px solid rgba(148, 163, 184, 0.08)',
              bgcolor: isSelected ? 'rgba(251, 191, 36, 0.03)' : 'background.paper',
              boxShadow: isSelected ? '0 8px 25px rgba(251, 191, 36, 0.15)' : 'none',
              transform: isSelected ? 'translateY(-2px)' : 'none',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                borderColor: isSelected ? 'primary.main' : 'rgba(251, 191, 36, 0.3)',
                bgcolor: isSelected ? 'rgba(251, 191, 36, 0.05)' : 'rgba(148, 163, 184, 0.02)',
                transform: 'translateY(-2px)',
              }
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Stack direction="row" alignItems="center" spacing={2.5}>
                <Radio
                  checked={isSelected}
                  onChange={() => onSelectMethod(method.id)}
                  value={method.id}
                  sx={{
                    color: 'text.secondary',
                    '&.Mui-checked': {
                      color: 'primary.main',
                    }
                  }}
                />
                
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    bgcolor: `${method.color}15`,
                    color: method.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <IconComponent sx={{ fontSize: 28 }} />
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {method.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {method.description}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
};

export default PaymentMethodCard;
