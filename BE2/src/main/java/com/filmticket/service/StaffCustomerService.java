package com.filmticket.service;

import com.filmticket.dto.UserResponse;
import com.filmticket.entity.User;
import com.filmticket.exception.BadRequestException;
import com.filmticket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffCustomerService {

    private final UserRepository userRepository;

    public List<UserResponse> listCustomers() {
        return userRepository.findAll().stream()
                .map(UserResponse::fromUser)
                .toList();
    }

    public UserResponse getCustomer(UUID customerId) {
        User user = userRepository.findById(customerId)
                .orElseThrow(() -> new BadRequestException("Customer not found"));
        return UserResponse.fromUser(user);
    }

    public Object getBookingHistory(UUID customerId) {
        return List.of();
    }

    public Object getOnlinePurchaseHistory(UUID customerId) {
        return List.of();
    }

    @Transactional
    public UserResponse lockCustomer(UUID customerId) {
        User user = userRepository.findById(customerId)
                .orElseThrow(() -> new BadRequestException("Customer not found"));
        user.setEnabled(false);
        return UserResponse.fromUser(userRepository.save(user));
    }

    @Transactional
    public UserResponse unlockCustomer(UUID customerId) {
        User user = userRepository.findById(customerId)
                .orElseThrow(() -> new BadRequestException("Customer not found"));
        user.setEnabled(true);
        return UserResponse.fromUser(userRepository.save(user));
    }

    public Object handleComplaint(UUID customerId, String complaintDetails) {
        return complaintDetails;
    }
}
