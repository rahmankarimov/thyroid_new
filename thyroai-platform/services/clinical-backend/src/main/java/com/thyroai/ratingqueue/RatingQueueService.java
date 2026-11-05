package com.thyroai.ratingqueue;

import com.thyroai.examination.Examination;
import com.thyroai.examination.ExaminationRepository;
import com.thyroai.user.User;
import com.thyroai.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RatingQueueService {

    private final ExaminationRepository examinationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public java.util.Map<String, UUID> getNextRandomExaminationId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        Optional<String> nextExamIdStr = examinationRepository.findNextRandomForRating(currentUser.getId().toString());
        String examIdStr = nextExamIdStr.orElseThrow(() -> new IllegalArgumentException("No more images to rate in the queue!"));
        UUID examId = UUID.fromString(examIdStr);

        Examination exam = examinationRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examId));

        return java.util.Map.of("patientId", exam.getPatient().getId(), "examId", examId);
    }
}
