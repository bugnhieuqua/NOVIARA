import time
import random
import numpy as np
from typing import List, Dict, Any
from backend.schemas import StudentSchema, GroupingConfigSchema, BenchmarkRequest
from backend.services.ga_service import FastGAEngine, decode_chromosome, calculate_group_metrics


def run_random_method(students: List[StudentSchema], config: GroupingConfigSchema) -> Dict[str, float]:
    n_students = len(students)
    n_groups = config.targetGroupCount
    perm = list(range(n_students))
    random.shuffle(perm)

    group_indices = decode_chromosome(perm, n_groups)
    metrics_list = []
    for indices in group_indices:
        members = [students[i] for i in indices]
        m = calculate_group_metrics(members, config)
        metrics_list.append(m)

    avg_skill = float(np.mean([m.skillBalanceScore for m in metrics_list]))
    avg_disc = float(np.mean([m.discDiversityScore for m in metrics_list]))
    total_violations = sum(len(m.constraintViolations) for m in metrics_list)
    fitness = max(10.0, min(100.0, (avg_skill * 0.5 + avg_disc * 0.5) - total_violations * 5.0))

    return {
        "fitness": round(fitness, 1),
        "balance": round(avg_skill, 1),
        "diversity": round(avg_disc, 1),
        "violations": total_violations
    }


def run_greedy_method(students: List[StudentSchema], config: GroupingConfigSchema) -> Dict[str, float]:
    n_students = len(students)
    n_groups = config.targetGroupCount
    
    # Sắp xếp theo GPA + kỹ năng
    sorted_idx = sorted(range(n_students), key=lambda i: (students[i].gpa * 0.4 + sum(students[i].skills.values()) * 0.6), reverse=True)
    
    groups: List[List[StudentSchema]] = [[] for _ in range(n_groups)]
    group_sums = [0.0] * n_groups
    base_size = n_students // n_groups
    remainder = n_students % n_groups

    for idx in sorted_idx:
        # Chọn nhóm có tổng điểm thấp nhất và chưa đủ quân số
        available_groups = [
            g for g in range(n_groups) 
            if len(groups[g]) < (base_size + (1 if g < remainder else 0))
        ]
        if not available_groups:
            available_groups = list(range(n_groups))
            
        best_g = min(available_groups, key=lambda g: group_sums[g])
        groups[best_g].append(students[idx])
        group_sums[best_g] += students[idx].gpa

    metrics_list = [calculate_group_metrics(members, config) for members in groups]
    avg_skill = float(np.mean([m.skillBalanceScore for m in metrics_list]))
    avg_disc = float(np.mean([m.discDiversityScore for m in metrics_list]))
    total_violations = sum(len(m.constraintViolations) for m in metrics_list)
    fitness = max(10.0, min(100.0, (avg_skill * 0.5 + avg_disc * 0.5) - total_violations * 5.0))

    return {
        "fitness": round(fitness, 1),
        "balance": round(avg_skill, 1),
        "diversity": round(avg_disc, 1),
        "violations": total_violations
    }


def benchmark_algorithms(req: BenchmarkRequest) -> Dict[str, Any]:
    """Chạy so sánh các thuật toán phân nhóm theo phong cách NOVIARA_python."""
    students = req.students
    config = req.config
    results: Dict[str, Dict[str, Any]] = {}

    # 1. Random (10 runs)
    rand_fitnesses = []
    rand_balances = []
    rand_diversities = []
    rand_violations = []
    t0 = time.time()
    for _ in range(10):
        r = run_random_method(students, config)
        rand_fitnesses.append(r["fitness"])
        rand_balances.append(r["balance"])
        rand_diversities.append(r["diversity"])
        rand_violations.append(r["violations"])
    t_rand = (time.time() - t0) * 100.0

    results["random"] = {
        "name": "Random Grouping (Phân nhóm ngẫu nhiên)",
        "fitness": {"mean": round(float(np.mean(rand_fitnesses)), 1), "std": round(float(np.std(rand_fitnesses)), 2)},
        "balance": {"mean": round(float(np.mean(rand_balances)), 1), "std": round(float(np.std(rand_balances)), 2)},
        "diversity": {"mean": round(float(np.mean(rand_diversities)), 1), "std": round(float(np.std(rand_diversities)), 2)},
        "violations": round(float(np.mean(rand_violations)), 1),
        "runtimeMs": round(t_rand, 2),
        "badge": "Baseline"
    }

    # 2. Greedy Method
    t0 = time.time()
    greedy_res = run_greedy_method(students, config)
    t_greedy = (time.time() - t0) * 1000.0
    results["greedy"] = {
        "name": "Greedy Heuristic (Tham lam cân bằng điểm)",
        "fitness": {"mean": greedy_res["fitness"], "std": 0.0},
        "balance": {"mean": greedy_res["balance"], "std": 0.0},
        "diversity": {"mean": greedy_res["diversity"], "std": 0.0},
        "violations": greedy_res["violations"],
        "runtimeMs": round(t_greedy, 2),
        "badge": "Heuristic"
    }

    # 3. GA Method
    t0 = time.time()
    engine = FastGAEngine(students, config)
    ga_res = engine.run_sync()
    t_ga = ga_res.executionTimeMs

    metrics_list = [g.metrics for g in ga_res.groups]
    ga_balance = float(np.mean([m.skillBalanceScore for m in metrics_list]))
    ga_diversity = float(np.mean([m.discDiversityScore for m in metrics_list]))
    ga_violations = sum(len(m.constraintViolations) for m in metrics_list)

    results["ga"] = {
        "name": "NOVIARA Genetic Algorithm (GA Tối ưu đa mục tiêu)",
        "fitness": {"mean": ga_res.overallFitness, "std": 0.0},
        "balance": {"mean": round(ga_balance, 1), "std": 0.0},
        "diversity": {"mean": round(ga_diversity, 1), "std": 0.0},
        "violations": ga_violations,
        "runtimeMs": round(t_ga, 2),
        "badge": "Optimal AI Engine"
    }

    return {
        "success": True,
        "totalStudents": len(students),
        "targetGroups": config.targetGroupCount,
        "results": results
    }
