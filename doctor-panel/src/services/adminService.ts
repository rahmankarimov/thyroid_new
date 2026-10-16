import { api } from "./api";

export interface AdminStats {
    totalImages: number;
    pendingReview: number;
    completed: number;
}

export interface DoctorActivity {
    doctorId: string;
    doctorName: string;
    email: string;
    ratedCount: number;
}

export interface AdminDoctorRating {
    examinationId: string;
    patientId: string;
    totalPoints: number;
    level: string;
    createdAt: string;
}

export const adminService = {
    getStats(): Promise<AdminStats> {
        return api.get<AdminStats>("/admin/dashboard/stats");
    },
    getDoctorActivity(): Promise<DoctorActivity[]> {
        return api.get<DoctorActivity[]>("/admin/dashboard/doctor-activity");
    },
    getDoctorRatings(doctorId: string): Promise<AdminDoctorRating[]> {
        return api.get<AdminDoctorRating[]>(`/admin/dashboard/doctor-activity/${doctorId}/ratings`);
    }
};
