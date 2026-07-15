package com.filmticket.repository;
import com.filmticket.entity.ComboInventoryRecipe;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface ComboInventoryRecipeRepository extends JpaRepository<ComboInventoryRecipe, UUID> {
    List<ComboInventoryRecipe> findByInventoryItemId(UUID inventoryItemId);
    Optional<ComboInventoryRecipe> findByComboIdAndInventoryItemId(UUID comboId, UUID inventoryItemId);
}
