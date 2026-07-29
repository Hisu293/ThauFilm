import org.flywaydb.core.Flyway;

public class RepairFlyway {
    public static void main(String[] args) {
        Flyway flyway = Flyway.configure()
                .dataSource(
                        "jdbc:postgresql://aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0",
                        "postgres.akpmrhikkgvhrcmqgkuf",
                        "Thauphim0305"
                )
                .load();
        flyway.repair();
        System.out.println("Đã sửa chữa Flyway thành công.");
    }
}
