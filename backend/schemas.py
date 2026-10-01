from typing import List, Dict, Optional, Literal, Any
from pydantic import BaseModel, Field

DiscType = Literal['D', 'I', 'S', 'C']
GenderType = Literal['Nam', 'Nữ']
SkillKey = Literal[
    'frontend', 'backend', 'database', 'uiux', 'mobile',
    'devops', 'aiml', 'qa', 'presentation', 'management'
]

class DiscScores(BaseModel):
    D: float = 0.0
    I: float = 0.0
    S: float = 0.0
    C: float = 0.0

class DiscProfile(BaseModel):
    dominant: DiscType = 'D'
    secondary: Optional[DiscType] = None
    scores: DiscScores = Field(default_factory=DiscScores)

class StudentSchema(BaseModel):
    id: str
    name: str
    email: str = ""
    gender: GenderType = "Nam"
    gpa: float = 3.0
    classId: Optional[str] = None
    skills: Dict[str, float] = Field(default_factory=lambda: {
        'frontend': 3.0, 'backend': 3.0, 'database': 3.0, 'uiux': 3.0,
        'mobile': 3.0, 'devops': 3.0, 'aiml': 3.0, 'qa': 3.0,
        'presentation': 3.0, 'management': 3.0
    })
    primarySkill: str = 'frontend'
    secondarySkill: str = 'backend'
    disc: DiscProfile = Field(default_factory=DiscProfile)
    isLeaderCandidate: bool = False
    avatar: Optional[str] = None
    preferredTeammates: Optional[List[str]] = Field(default_factory=list)
    avoidTeammates: Optional[List[str]] = Field(default_factory=list)
    phone: Optional[str] = None
    notes: Optional[str] = None

class FitnessWeights(BaseModel):
    skillBalance: float = 35.0
    discDiversity: float = 25.0
    gpaBalance: float = 20.0
    genderBalance: float = 10.0
    constraintSatisfaction: float = 10.0

class GroupingConstraints(BaseModel):
    requireLeaderPerGroup: bool = False
    minFrontendPerGroup: int = 1
    minBackendPerGroup: int = 1
    minDesignPerGroup: int = 0
    balanceGender: bool = True
    maxGpaSpread: float = 0.4
    respectPreferences: bool = True
    forceNoPairingClashes: bool = True

class GAHyperparameters(BaseModel):
    populationSize: int = 100
    generations: int = 200
    mutationRate: float = 0.05
    crossoverRate: float = 0.8
    elitismRate: float = 0.1
    tournamentSize: int = 3

class GroupingConfigSchema(BaseModel):
    targetGroupCount: int = 4
    minMembers: int = 3
    maxMembers: int = 5
    fitnessWeights: FitnessWeights = Field(default_factory=FitnessWeights)
    constraints: GroupingConstraints = Field(default_factory=GroupingConstraints)
    gaHyperparameters: GAHyperparameters = Field(default_factory=GAHyperparameters)
    requiredSkills: List[str] = Field(default_factory=lambda: ['frontend', 'backend', 'database'])

class GroupMetricsSchema(BaseModel):
    avgGpa: float = 0.0
    gpaVariance: float = 0.0
    skillCoverage: Dict[str, float] = Field(default_factory=dict)
    skillBalanceScore: float = 0.0
    discProfile: DiscScores = Field(default_factory=DiscScores)
    discDiversityScore: float = 0.0
    genderRatio: Dict[str, int] = Field(default_factory=lambda: {"male": 0, "female": 0})
    constraintViolations: List[str] = Field(default_factory=list)
    compatibilityScore: float = 0.0

class GroupExplanationSchema(BaseModel):
    summary: str = ""
    synergyHighlights: List[str] = Field(default_factory=list)
    potentialRisks: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    leadershipAnalysis: str = ""
    discSynergy: str = ""
    skillCoverageSummary: str = ""

class GroupSchema(BaseModel):
    id: str
    groupNumber: int
    name: str
    topic: Optional[str] = None
    members: List[StudentSchema]
    leaderId: Optional[str] = None
    metrics: GroupMetricsSchema
    explanation: GroupExplanationSchema

class GenerationStepSchema(BaseModel):
    generation: int
    bestFitness: float
    avgFitness: float
    diversity: float
    violations: int
    timestamp: Optional[float] = None

class GARunRequest(BaseModel):
    students: List[StudentSchema]
    config: GroupingConfigSchema
    sessionTitle: Optional[str] = "Phân nhóm AI"

class GARunResponse(BaseModel):
    groups: List[GroupSchema]
    overallFitness: float
    convergenceHistory: List[GenerationStepSchema]
    executionTimeMs: float
    totalGenerations: int

class ExplainGroupRequest(BaseModel):
    groupNumber: int
    groupName: str
    members: List[StudentSchema]
    topic: Optional[str] = None
    mode: Optional[Literal["rule", "gemini", "hybrid"]] = "hybrid"

class LecturerRawInput(BaseModel):
    name: str
    department: Optional[str] = None
    phone: Optional[str] = None
    personalEmail: Optional[str] = None
    notes: Optional[str] = None

class AIAgentLecturerRequest(BaseModel):
    rawText: Optional[str] = None
    fileName: Optional[str] = None
    lecturers: Optional[List[LecturerRawInput]] = None

class BenchmarkRequest(BaseModel):
    students: List[StudentSchema]
    config: GroupingConfigSchema
    algorithms: Optional[List[str]] = Field(default_factory=lambda: ["ga", "greedy", "kmeans", "random"])
