/**
 * Knowledge Graph Contract
 * All subagents MUST follow this exact structure when building knowledge graphs
 */

export const KNOWLEDGE_GRAPH_CONTRACT = {
  // Node Types - MUST use these exact types
  NODE_TYPES: {
    PERSON: 'person',
    SKILL: 'skill',
    COMPANY: 'company',
    PROJECT: 'project',
    EDUCATION: 'education',
    CERTIFICATION: 'certification',
    ACHIEVEMENT: 'achievement',
    TECHNOLOGY: 'technology',
    ROLE: 'role'
  },

  // Edge Types - MUST use these exact types
  EDGE_TYPES: {
    HAS_SKILL: 'has_skill',
    WORKED_AT: 'worked_at',
    STUDIED_AT: 'studied_at',
    ACHIEVED: 'achieved',
    USES_TECHNOLOGY: 'uses_technology',
    HAS_ROLE: 'has_role',
    RELATED_TO: 'related_to',
    EARNED_CERTIFICATION: 'earned_certification',
    WORKED_ON_PROJECT: 'worked_on_project'
  },

  // Required structure for the output file
  REQUIRED_STRUCTURE: {
    personName: "string",
    extractedDate: "ISO date string",
    metadata: {
      resumeFile: "string",
      nodeCount: "number",
      edgeCount: "number"
    },
    personalInfo: {
      name: "string",
      email: "string",
      phone: "string",
      location: "string",
      linkedin: "string (optional)",
      github: "string (optional)",
      website: "string (optional)"
    },
    summary: "string (professional summary)",
    nodes: [
      {
        id: "string (must be unique, use format: type_uuid)",
        type: "string (from NODE_TYPES)",
        properties: {
          name: "string (required)",
          // Additional properties based on type:
          // For SKILL: { category, proficiencyLevel }
          // For COMPANY: { industry, location, size }
          // For PROJECT: { description, impact, technologies, duration }
          // For EDUCATION: { degree, school, gpa, graduation, location }
          // For ACHIEVEMENT: { description, metric, impact }
          // For ROLE: { title, level, department }
          // For TECHNOLOGY: { category, isFramework, isLanguage }
        }
      }
    ],
    edges: [
      {
        id: "string (must be unique, use format: edgeType_uuid)",
        source: "string (node id)",
        target: "string (node id)",
        type: "string (from EDGE_TYPES)",
        properties: {
          // Edge-specific properties:
          // For WORKED_AT: { startDate, endDate, role, location }
          // For HAS_SKILL: { proficiencyLevel, yearsOfExperience }
          // For ACHIEVED: { date, context, metric }
          // For STUDIED_AT: { degree, startDate, endDate, gpa }
        }
      }
    ],
    keyMetrics: {
      totalExperience: "number (years)",
      companiesWorked: "number",
      projectsCompleted: "number",
      technologiesUsed: "number",
      topAchievement: "string",
      impactMetrics: ["array of key impact numbers/percentages"]
    }
  },

  // Extraction Rules
  EXTRACTION_RULES: {
    1: "Extract ONLY information present in the resume - no hallucination",
    2: "Create person node FIRST with all contact details",
    3: "For each work experience, create: company node, role node, and WORKED_AT edge",
    4: "For each skill mentioned, create skill node and HAS_SKILL edge",
    5: "For each technology/tool, create technology node and USES_TECHNOLOGY edge",
    6: "For each project, create project node and WORKED_ON_PROJECT edge",
    7: "For each education entry, create education node and STUDIED_AT edge",
    8: "For quantifiable achievements ($X saved, Y% improvement), create achievement nodes",
    9: "All node IDs must be unique - use format: nodeType_randomUUID",
    10: "All edge IDs must be unique - use format: edgeType_randomUUID"
  },

  // Category Mappings
  SKILL_CATEGORIES: {
    'Programming Languages': ['Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'SQL'],
    'AI/ML': ['TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'LangChain', 'CrewAI', 'OpenAI', 'Hugging Face'],
    'Cloud Platforms': ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker'],
    'Databases': ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Cassandra', 'DynamoDB'],
    'Web Frameworks': ['React', 'Angular', 'Vue', 'Node.js', 'Django', 'Flask', 'Spring'],
    'Data Engineering': ['Spark', 'Hadoop', 'Kafka', 'Airflow', 'ETL', 'Data Pipeline'],
    'DevOps': ['CI/CD', 'Jenkins', 'GitHub Actions', 'GitLab', 'Terraform'],
    'Product Management': ['Agile', 'Scrum', 'JIRA', 'Confluence', 'Roadmapping', 'OKRs']
  },

  TECHNOLOGY_CATEGORIES: {
    'Languages': ['Python', 'Java', 'JavaScript', 'C++', 'Go', 'SQL'],
    'Frameworks': ['React', 'Django', 'Spring', 'Flask', 'Express'],
    'Cloud': ['AWS', 'Azure', 'GCP'],
    'Databases': ['MongoDB', 'PostgreSQL', 'MySQL'],
    'AI/ML': ['TensorFlow', 'PyTorch', 'LangChain'],
    'Tools': ['Git', 'Docker', 'Kubernetes', 'Jenkins']
  }
};

// Example of a properly formatted node
export const NODE_EXAMPLE = {
  id: "person_a1b2c3d4",
  type: "person",
  properties: {
    name: "John Doe",
    title: "Software Engineer",
    yearsOfExperience: 5
  }
};

// Example of a properly formatted edge
export const EDGE_EXAMPLE = {
  id: "worked_at_x1y2z3",
  source: "person_a1b2c3d4",
  target: "company_e5f6g7h8",
  type: "worked_at",
  properties: {
    startDate: "2020-01",
    endDate: "2023-12",
    role: "Senior Software Engineer",
    location: "Seattle, WA"
  }
};