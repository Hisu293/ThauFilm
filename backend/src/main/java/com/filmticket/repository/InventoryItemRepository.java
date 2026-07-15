package com.filmticket.repository;
import com.filmticket.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface InventoryItemRepository extends JpaRepository<InventoryItem, UUID> { List<InventoryItem> findByActiveTrueOrderByNameAsc(); }
