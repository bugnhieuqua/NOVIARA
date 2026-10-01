import time
import math
import random
import numpy as np
from typing import List, Dict, Tuple, AsyncGenerator, Any, Optional
from backend.schemas import (
    StudentSchema,
    GroupingConfigSchema,
    GroupSchema,
    GroupMetricsSchema,
    GroupExplanationSchema,
    GenerationStepSchema,
    GARunResponse,
    DiscScores,
)

ALL_SKILLS = ['frontend', 'backend', 'database', 'uiux', 'mobile', 'devops', 'aiml', 'qa', 'presentation', 'management']


def decode_chromosome(permutation: List[int], n_groups: int) -> List[List[int]]:
    """Giải mã permutation 0..N-1 thành n_groups nhóm cân bằng kích thước."""
    n_students = len(permutation)
    base_size = n_students // n_groups
    remainder = n_students % n_groups

    groups = []
    idx = 0
    for i in range(n_groups):
        current_size = base_size + (1 if i < remainder else 0)
        groups.append(permutation[idx:idx + current_size])
        idx += current_size

    return groups


def pmx_crossover(parent1: List[int], parent2: List[int]) -> Tuple[List[int], List[int]]:
    """Partially Mapped Crossover (PMX) cho permutation."""
    n = len(parent1)
    if n <= 2:
        return parent1.copy(), parent2.copy()

    cx_point1 = random.randint(0, n - 2)
    cx_point2 = random.randint(cx_point1 + 1, n - 1)

    child1 = parent1[:]
    child2 = parent2[:]

    mapping1 = {}
    mapping2 = {}
    for i in range(cx_point1, cx_point2 + 1):
        mapping1[parent2[i]] = parent1[i]
        mapping2[parent1[i]] = parent2[i]
        child1[i] = parent2[i]
        child2[i] = parent1[i]

    for i in range(n):
        if i < cx_point1 or i > cx_point2:
            val1 = child1[i]
            while val1 in mapping1:
                val1 = mapping1[val1]
            child1[i] = val1

            val2 = child2[i]
            while val2 in mapping2:
                val2 = mapping2[val2]
            child2[i] = val2

    return child1, child2


def swap_mutation(permutation: List[int], mutation_rate: float = 0.05) -> List[int]:
    """Đột biến Swap cho permutation."""
    if random.random() > mutation_rate:
        return permutation.copy()

    new_perm = permutation.copy()
    n = len(new_perm)
    if n < 2:
        return new_perm

    idx1 = random.randint(0, n - 1)
    idx2 = random.randint(0, n - 1)
    while idx2 == idx1:
        idx2 = random.randint(0, n - 1)

    new_perm[idx1], new_perm[idx2] = new_perm[idx2], new_perm[idx1]
    return new_perm


def calculate_group_metrics(members: List[StudentSchema], config: GroupingConfigSchema) -> GroupMetricsSchema:
    if not members:
        return GroupMetricsSchema()

    # 1. GPA
    gpas = [m.gpa for m in members]
    avg_gpa = float(np.mean(gpas))
    gpa_var = float(np.var(gpas)) if len(gpas) > 1 else 0.0

    # 2. Skill coverage
    skill_coverage: Dict[str, float] = {}
    for skill in ALL_SKILLS:
        vals = [m.skills.get(skill, 1.0) for m in members]
        skill_coverage[skill] = round(float(np.mean(vals)), 2)

    req_skills = config.requiredSkills or ['frontend', 'backend', 'database']
    req_scores = [skill_coverage.get(s, 1.0) for s in req_skills]
    avg_req_skill = float(np.mean(req_scores)) if req_scores else 3.0
    skill_balance_score = round(min(100.0, max(10.0, (avg_req_skill / 5.0) * 100.0)), 1)

    # 3. DISC Profile
    d_total = sum(m.disc.scores.D for m in members) / len(members)
    i_total = sum(m.disc.scores.I for m in members) / len(members)
    s_total = sum(m.disc.scores.S for m in members) / len(members)
    c_total = sum(m.disc.scores.C for m in members) / len(members)

    disc_profile = DiscScores(
        D=round(d_total, 1),
        I=round(i_total, 1),
        S=round(s_total, 1),
        C=round(c_total, 1)
    )

    # DISC Entropy / Diversity (Công thức từ NOVIARA_python/src/fitness.py)
    disc_traits = [d_total, i_total, s_total, c_total]
    disc_std = float(np.std(disc_traits))
    disc_diversity_score = round(min(100.0, max(20.0, 100.0 - (disc_std * 0.8))), 1)

    # 4. Gender ratio
    males = sum(1 for m in members if m.gender == 'Nam')
    females = sum(1 for m in members if m.gender == 'Nữ')
    gender_ratio = {"male": males, "female": females}

    # 5. Ràng buộc và Vi phạm
    violations: List[str] = []
    
    # Leader
    has_leader = any(m.isLeaderCandidate for m in members)
    if config.constraints.requireLeaderPerGroup and not has_leader:
        violations.append("Thiếu ứng viên Leader trong nhóm")

    # Min frontend & backend
    fe_count = sum(1 for m in members if m.skills.get('frontend', 0) >= 3.0 or m.primarySkill == 'frontend')
    if fe_count < config.constraints.minFrontendPerGroup:
        violations.append(f"Thiếu thành viên Frontend (có {fe_count}/{config.constraints.minFrontendPerGroup})")

    be_count = sum(1 for m in members if m.skills.get('backend', 0) >= 3.0 or m.primarySkill == 'backend')
    if be_count < config.constraints.minBackendPerGroup:
        violations.append(f"Thiếu thành viên Backend (có {be_count}/{config.constraints.minBackendPerGroup})")

    # Clashes
    member_ids = set(m.id for m in members)
    if config.constraints.forceNoPairingClashes:
        for m in members:
            for avoid_id in (m.avoidTeammates or []):
                if avoid_id in member_ids:
                    violations.append(f"Xung đột ghép cặp: {m.name} và SV ({avoid_id})")

    penalty = len(violations) * 12.0
    comp_score = max(10.0, min(100.0, round(((skill_balance_score * 0.5) + (disc_diversity_score * 0.5)) - penalty, 1)))

    return GroupMetricsSchema(
        avgGpa=round(avg_gpa, 2),
        gpaVariance=round(gpa_var, 3),
        skillCoverage=skill_coverage,
        skillBalanceScore=skill_balance_score,
        discProfile=disc_profile,
        discDiversityScore=disc_diversity_score,
        genderRatio=gender_ratio,
        constraintViolations=violations,
        compatibilityScore=comp_score
    )


def generate_rule_explanation(members: List[StudentSchema], metrics: GroupMetricsSchema) -> GroupExplanationSchema:
    synergies = []
    risks = []
    recs = []

    leaders = [m for m in members if m.isLeaderCandidate]
    if len(leaders) == 1:
        synergies.append(f"Trưởng nhóm: {leaders[0].name} ({leaders[0].primarySkill.upper()}) với định hướng dẫn dắt tốt.")
        leader_analysis = f"Đề xuất {leaders[0].name} giữ vai trò Leader nhờ hồ sơ DISC cân bằng và kỹ năng quản lý."
    elif len(leaders) > 1:
        risks.append(f"Có {len(leaders)} ứng viên Leader ({', '.join(l.name for l in leaders)}), cần phân chia rõ vai trò kỹ thuật và quản lý.")
        leader_analysis = f"Đề xuất {leaders[0].name} làm Team Leader và {leaders[1].name} làm Tech Lead."
    else:
        risks.append("Nhóm chưa có ứng viên Leader rõ rệt, cần giảng viên hỗ trợ chỉ định.")
        leader_analysis = "Chưa có Leader chỉ định - đề xuất thành viên có điểm cao nhất điều phối."

    if metrics.skillBalanceScore >= 75:
        synergies.append("Đội hình cân bằng tốt giữa Frontend, Backend và Cơ sở dữ liệu.")
    elif metrics.skillBalanceScore < 60:
        risks.append("Kỹ năng nhóm còn chênh lệch, một số mảng chuyên môn cần thêm hỗ trợ.")

    disc = metrics.discProfile
    if disc.D >= 60 and disc.I >= 50:
        disc_synergy = "Nhóm có động lực hành động và khả năng giao tiếp mạnh mẽ."
    elif disc.S >= 60 and disc.C >= 60:
        disc_synergy = "Nhóm cẩn trọng, tỉ mỉ, độ tin cậy cao và hoàn thành deadline ổn định."
    else:
        disc_synergy = "Sự phân bổ tính cách đa dạng giúp nhóm bổ trợ hài hòa góc nhìn giải quyết vấn đề."

    recs.append("Phân chia công việc theo thế mạnh chuyên môn và tổ chức daily standup định kỳ.")
    if len(members) >= 4:
        recs.append("Thiết lập cặp lập trình (Pair Programming) giữa thành viên giỏi và thành viên đang phát triển.")

    summary = f"Nhóm gồm {len(members)} thành viên với độ tương thích {metrics.compatibilityScore}%. {synergies[0] if synergies else 'Cơ cấu nhóm ổn định.'}"

    return GroupExplanationSchema(
        summary=summary,
        synergyHighlights=synergies if synergies else ["Kỹ năng các thành viên phối hợp hài hòa."],
        potentialRisks=risks if risks else ["Không phát hiện rủi ro phân nhóm nghiêm trọng."],
        recommendations=recs,
        leadershipAnalysis=leader_analysis,
        discSynergy=disc_synergy,
        skillCoverageSummary=f"Điểm kỹ năng bình quân: Frontend ({metrics.skillCoverage.get('frontend', 0)}/5), Backend ({metrics.skillCoverage.get('backend', 0)}/5), DB ({metrics.skillCoverage.get('database', 0)}/5)"
    )


class FastGAEngine:
    """
    GA Engine phân nhóm sinh viên kết hợp permutation encoding từ NOVIARA_python.
    """
    def __init__(self, students: List[StudentSchema], config: GroupingConfigSchema):
        self.students = students
        self.config = config
        self.n_students = len(students)
        self.n_groups = config.targetGroupCount
        self.hyper = config.gaHyperparameters

    def evaluate_chromosome(self, permutation: List[int]) -> Tuple[float, int, float]:
        """Đánh giá 1 permutation chromosome."""
        group_indices = decode_chromosome(permutation, self.n_groups)

        total_skill_score = 0.0
        total_disc_score = 0.0
        total_violations = 0
        group_skill_means = []
        group_gpas = []

        for indices in group_indices:
            members = [self.students[i] for i in indices]
            m_len = len(members)

            if m_len < self.config.minMembers:
                total_violations += (self.config.minMembers - m_len) * 3
            if m_len > self.config.maxMembers:
                total_violations += (m_len - self.config.maxMembers) * 3

            if m_len == 0:
                total_violations += 10
                continue

            metrics = calculate_group_metrics(members, self.config)
            total_skill_score += metrics.skillBalanceScore
            total_disc_score += metrics.discDiversityScore
            total_violations += len(metrics.constraintViolations)
            group_gpas.append(metrics.avgGpa)
            group_skill_means.append(metrics.skillBalanceScore)

        # Tính balance: 1 / (1 + std(group_skills))
        std_skill = float(np.std(group_skill_means)) if len(group_skill_means) > 1 else 0.0
        balance_metric = (1.0 / (1.0 + (std_skill / 10.0))) * 100.0

        avg_skill = total_skill_score / self.n_groups if self.n_groups > 0 else 0.0
        avg_disc = total_disc_score / self.n_groups if self.n_groups > 0 else 0.0

        # Cân bằng GPA
        gpa_spread_score = 100.0
        if len(group_gpas) > 1:
            gpa_std = float(np.std(group_gpas))
            gpa_spread_score = max(0.0, 100.0 - (gpa_std * 160.0))

        # Trọng số
        w = self.config.fitnessWeights
        total_w = w.skillBalance + w.discDiversity + w.gpaBalance + w.genderBalance + w.constraintSatisfaction
        if total_w <= 0:
            total_w = 100.0

        ws = w.skillBalance / total_w
        wd = w.discDiversity / total_w
        wg = w.gpaBalance / total_w
        wc = w.constraintSatisfaction / total_w

        raw_fitness = (balance_metric * ws) + (avg_disc * wd) + (gpa_spread_score * wg)
        penalty = total_violations * 4.0 * wc
        final_fitness = max(5.0, min(100.0, raw_fitness - penalty))

        return final_fitness, total_violations, avg_disc

    def initialize_population(self) -> List[List[int]]:
        pop = []
        for _ in range(self.hyper.populationSize):
            perm = list(range(self.n_students))
            random.shuffle(perm)
            pop.append(perm)
        return pop

    def tournament_selection(self, pop: List[List[int]], fitnesses: List[float]) -> List[int]:
        k = min(self.hyper.tournamentSize, len(pop))
        candidates_idx = random.sample(range(len(pop)), k)
        best_idx = max(candidates_idx, key=lambda idx: fitnesses[idx])
        return pop[best_idx]

    def build_solution(self, best_permutation: List[int]) -> List[GroupSchema]:
        group_indices = decode_chromosome(best_permutation, self.n_groups)
        groups: List[GroupSchema] = []

        for g_idx, indices in enumerate(group_indices):
            grp_num = g_idx + 1
            members = [self.students[i] for i in indices]
            metrics = calculate_group_metrics(members, self.config)
            explanation = generate_rule_explanation(members, metrics)

            leaders = [m for m in members if m.isLeaderCandidate]
            leader_id = leaders[0].id if leaders else (members[0].id if members else None)

            groups.append(GroupSchema(
                id=f"GRP-{grp_num:02d}",
                groupNumber=grp_num,
                name=f"Nhóm {grp_num}: {members[0].primarySkill.capitalize() if members else 'Squad'} Team",
                topic=f"Đề tài phát triển hệ thống {grp_num}",
                members=members,
                leaderId=leader_id,
                metrics=metrics,
                explanation=explanation
            ))
        return groups

    def run_sync(self) -> GARunResponse:
        start_time = time.time()
        population = self.initialize_population()
        convergence: List[GenerationStepSchema] = []

        best_ind = population[0]
        best_fit = -1.0

        for gen in range(1, self.hyper.generations + 1):
            evaluated = [self.evaluate_chromosome(ind) for ind in population]
            fitness_scores = [e[0] for e in evaluated]
            violations_scores = [e[1] for e in evaluated]
            diversity_scores = [e[2] for e in evaluated]

            max_idx = int(np.argmax(fitness_scores))
            current_best_fit = fitness_scores[max_idx]
            current_avg_fit = float(np.mean(fitness_scores))

            if current_best_fit > best_fit:
                best_fit = current_best_fit
                best_ind = population[max_idx].copy()

            step = GenerationStepSchema(
                generation=gen,
                bestFitness=round(current_best_fit, 1),
                avgFitness=round(current_avg_fit, 1),
                diversity=round(diversity_scores[max_idx], 1),
                violations=violations_scores[max_idx],
                timestamp=time.time()
            )
            convergence.append(step)

            new_pop = []
            elitism_count = max(1, int(self.hyper.populationSize * self.hyper.elitismRate))
            sorted_indices = np.argsort(fitness_scores)[::-1]
            for i in range(elitism_count):
                new_pop.append(population[sorted_indices[i]].copy())

            while len(new_pop) < self.hyper.populationSize:
                p1 = self.tournament_selection(population, fitness_scores)
                p2 = self.tournament_selection(population, fitness_scores)
                c1, c2 = pmx_crossover(p1, p2)
                new_pop.append(swap_mutation(c1, self.hyper.mutationRate))
                if len(new_pop) < self.hyper.populationSize:
                    new_pop.append(swap_mutation(c2, self.hyper.mutationRate))

            population = new_pop

        exec_time = (time.time() - start_time) * 1000.0
        final_groups = self.build_solution(best_ind)

        return GARunResponse(
            groups=final_groups,
            overallFitness=round(best_fit, 1),
            convergenceHistory=convergence,
            executionTimeMs=round(exec_time, 1),
            totalGenerations=self.hyper.generations
        )

    async def run_streaming(self) -> AsyncGenerator[Dict[str, Any], None]:
        start_time = time.time()
        population = self.initialize_population()
        best_ind = population[0]
        best_fit = -1.0
        convergence: List[GenerationStepSchema] = []

        for gen in range(1, self.hyper.generations + 1):
            evaluated = [self.evaluate_chromosome(ind) for ind in population]
            fitness_scores = [e[0] for e in evaluated]
            violations_scores = [e[1] for e in evaluated]
            diversity_scores = [e[2] for e in evaluated]

            max_idx = int(np.argmax(fitness_scores))
            current_best_fit = fitness_scores[max_idx]
            current_avg_fit = float(np.mean(fitness_scores))

            if current_best_fit > best_fit:
                best_fit = current_best_fit
                best_ind = population[max_idx].copy()

            step = GenerationStepSchema(
                generation=gen,
                bestFitness=round(current_best_fit, 1),
                avgFitness=round(current_avg_fit, 1),
                diversity=round(diversity_scores[max_idx], 1),
                violations=violations_scores[max_idx],
                timestamp=time.time()
            )
            convergence.append(step)

            if gen % 5 == 0 or gen == 1 or gen == self.hyper.generations:
                yield {
                    "type": "progress",
                    "step": step.model_dump(),
                    "totalGenerations": self.hyper.generations
                }

            new_pop = []
            elitism_count = max(1, int(self.hyper.populationSize * self.hyper.elitismRate))
            sorted_indices = np.argsort(fitness_scores)[::-1]
            for i in range(elitism_count):
                new_pop.append(population[sorted_indices[i]].copy())

            while len(new_pop) < self.hyper.populationSize:
                p1 = self.tournament_selection(population, fitness_scores)
                p2 = self.tournament_selection(population, fitness_scores)
                c1, c2 = pmx_crossover(p1, p2)
                new_pop.append(swap_mutation(c1, self.hyper.mutationRate))
                if len(new_pop) < self.hyper.populationSize:
                    new_pop.append(swap_mutation(c2, self.hyper.mutationRate))

            population = new_pop

        exec_time = (time.time() - start_time) * 1000.0
        final_groups = self.build_solution(best_ind)

        final_response = GARunResponse(
            groups=final_groups,
            overallFitness=round(best_fit, 1),
            convergenceHistory=convergence,
            executionTimeMs=round(exec_time, 1),
            totalGenerations=self.hyper.generations
        )

        yield {
            "type": "completed",
            "result": final_response.model_dump()
        }
