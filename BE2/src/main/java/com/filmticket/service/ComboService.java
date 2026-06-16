package com.filmticket.service;

import com.filmticket.dto.ComboRequest;
import com.filmticket.dto.ComboResponse;
import com.filmticket.entity.Combo;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.ComboRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ComboService {

    private final ComboRepository comboRepository;

    @Transactional(readOnly = true)
    public List<ComboResponse> getCombos(List<UUID> ids) {
        List<Combo> combos = ids == null || ids.isEmpty()
                ? comboRepository.findByActiveTrue()
                : comboRepository.findAllById(ids);
        return combos.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ComboResponse> getAllActiveCombos() {
        return getCombos(null);
    }

    @Transactional
    public ComboResponse createCombo(ComboRequest request) {
        Combo combo = Combo.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .build();
        Combo saved = comboRepository.save(combo);
        return toResponse(saved);
    }

    @Transactional
    public ComboResponse updateCombo(UUID id, ComboRequest request) {
        Combo combo = comboRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Combo not found"));
        combo.setName(request.getName());
        combo.setDescription(request.getDescription());
        combo.setPrice(request.getPrice());
        Combo saved = comboRepository.save(combo);
        return toResponse(saved);
    }

    @Transactional
    public void setComboActive(UUID id, boolean active) {
        Combo combo = comboRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Combo not found"));
        combo.setActive(active);
        comboRepository.save(combo);
    }

    private ComboResponse toResponse(Combo combo) {
        return ComboResponse.builder()
                .id(combo.getId())
                .name(combo.getName())
                .description(combo.getDescription())
                .price(combo.getPrice())
                .active(combo.isActive())
                .build();
    }
}
