export interface ImageAsset {
  base: string;
  fallback: 'png' | 'jpg';
  widths: number[];
  width: number;
  height: number;
  alt: string;
  position?: string;
}

export interface LinkItem {
  label: string;
  href: string;
  meta?: string;
}

export interface MissionMetric {
  value: string;
  label: string;
}

export interface Mission {
  slug: 'orca' | 'propeller-research' | 'genesis-simulation';
  index: string;
  eyebrow: string;
  title: string;
  shortTitle: string;
  role: string;
  organization: string;
  dates: string;
  summary: string;
  challenge: string;
  image: ImageAsset;
  secondaryImage?: ImageAsset;
  metrics: MissionMetric[];
  contributions: string[];
  results: string[];
  tools: string[];
  documents: LinkItem[];
}

export interface ArchiveProject {
  title: string;
  category: string;
  dates: string;
  summary: string;
  image: ImageAsset | null;
  video?: { mp4: string; webm: string; poster: string; label: string };
  tools: string[];
  documents: LinkItem[];
}

export interface Experience {
  role: string;
  organization: string;
  location?: string;
  dates: string;
  summary: string;
  bullets: string[];
}

export const site = {
  name: 'Fourie van Rooyen',
  discipline: 'Aerospace Engineer',
  currentRole: 'Mechanical Engineer I · RTX',
  description:
    'Aerospace engineer focused on applied aerodynamics, propulsion systems, simulation, and experimental validation.',
  url: 'https://fourievanrooyen.github.io',
  email: 'fourievr1014@gmail.com',
  phoneDisplay: '+1 659 210 9953',
  phoneHref: 'tel:+16592109953',
  linkedin: 'https://www.linkedin.com/in/fourie-van-rooyen/',
};

export const profileImage: ImageAsset = {
  base: 'profile',
  fallback: 'png',
  widths: [480, 768, 1024],
  width: 1024,
  height: 1536,
  alt: 'Portrait of Fourie van Rooyen',
  position: '50% 28%',
};

export const featuredMissions: Mission[] = [
  {
    slug: 'orca',
    index: '01',
    eyebrow: 'Capstone · Flight-tested system',
    title: 'ORCA Fixed-Wing eVTOL Tiltrotor UAV',
    shortTitle: 'Project ORCA',
    role: 'Chief Engineer',
    organization: 'The University of Alabama',
    dates: 'Aug 2025 — May 2026',
    summary:
      'Led the system-level development of a reconnaissance UAV that combines vertical takeoff with efficient fixed-wing cruise.',
    challenge:
      'Carry a multidisciplinary aircraft from mission concept through analysis, integration, and two field-test campaigns while resolving aerodynamic, structural, avionics, power, and mass tradeoffs.',
    image: {
      base: 'orca-evtol', fallback: 'png', widths: [640, 991], width: 991, height: 658,
      alt: 'ORCA fixed-wing eVTOL tiltrotor UAV',
    },
    metrics: [
      { value: 'VTOL → CRUISE → VTOL', label: 'Flight transition demonstrated' },
      { value: '10.5–11.2', label: 'Validated cruise lift-to-drag ratio' },
      { value: '≥ 2.0', label: 'Primary-structure factor of safety' },
      { value: '38 pages', label: 'Post-flight analysis report' },
    ],
    contributions: [
      'Led the full NASA NPR 7123.1D design lifecycle and cross-subsystem integration across aerodynamics, structures, propulsion, avionics, and manufacturing.',
      'Executed 3D ANSYS Fluent cruise CFD at 17 m/s, ANSYS Mechanical FEA, and transient thermal analysis.',
      'Configured and flight-validated ArduPlane QuadPlane firmware on a Matek F405-Wing V2, resolving a TIM8 conflict so DSHOT and PWM could operate simultaneously.',
      'Analyzed ArduPilot DataFlash logs to identify EKF3 altitude divergence and UV-induced PLA structural softening after in-flight anomalies.',
      'Conducted crush testing on printed structures and identified 7% gyroid infill as the best strength-to-weight configuration tested.',
    ],
    results: [
      'Achieved stable VTOL hover and a successful VTOL-to-cruise-to-VTOL transition in field testing.',
      'Validated an aerodynamic L/D of approximately 10.5–11.2 and zero structural yield under modeled flight loads.',
      'Documented anomalies, corrective actions, and lessons learned in a 38-page Post-Flight Analysis Report.',
    ],
    tools: ['ANSYS Fluent', 'ANSYS Mechanical', 'SolidWorks', 'ArduPilot', 'MATLAB', 'CFD', 'FEA', 'Flight testing'],
    documents: [
      { label: 'Read ORCA project documentation', href: '/docs/orca-project-documentation.pdf', meta: 'PDF' },
    ],
  },
  {
    slug: 'propeller-research',
    index: '02',
    eyebrow: 'Research · Experimental validation',
    title: 'UAV Propeller Research',
    shortTitle: 'A.A.E.R.O. Propeller Research',
    role: 'Co-Founder · CFD & Testing Lead',
    organization: 'Alabama Aerodynamics Experimental Research Operations',
    dates: 'Jan 2025 — May 2026',
    summary:
      'Designed and tested drone propellers with vortex inducers, connecting computational predictions to measured thrust and acoustic behavior.',
    challenge:
      'Determine whether vortex-inducer concepts could improve small-UAV propeller behavior, then create a repeatable path from CAD and simulation to manufactured hardware and real-world validation.',
    image: {
      base: 'uav-propeller-research', fallback: 'png', widths: [640, 905], width: 905, height: 622,
      alt: 'UAV propeller research test article and analysis',
    },
    secondaryImage: {
      base: 'urca-poster-2025', fallback: 'jpg', widths: [640, 960, 1200], width: 1200, height: 900,
      alt: 'URCA 2025 UAV propeller research poster',
    },
    metrics: [
      { value: 'CFD + FEA', label: 'Coupled analysis workflow' },
      { value: 'THRUST · RPM · dB', label: 'Static test measurements' },
      { value: 'WIND TUNNEL', label: 'Aerodynamic validation' },
    ],
    contributions: [
      'Led propeller geometry development with vortex inducers and prepared designs for repeatable manufacturing.',
      'Simulated thrust and acoustic characteristics in ANSYS and SolidWorks, then compared predictions with physical test data.',
      'Performed FEA to assess structural integrity and material performance before testing.',
      'Applied GD&T to manufacturing documentation for precise component production.',
      'Conducted static test-stand experiments measuring thrust, RPM, and acoustics across multiple iterations, followed by wind-tunnel data collection.',
    ],
    results: [
      'Established an analysis-to-test workflow combining CFD, FEA, static bench measurements, and wind-tunnel validation.',
      'Produced documented, comparable evidence across multiple design iterations without substituting unverified performance claims.',
    ],
    tools: ['ANSYS', 'SolidWorks', 'CFD', 'FEA', 'Wind tunnel', 'GD&T', 'Test instrumentation'],
    documents: [
      { label: 'View URCA 2025 research poster', href: '/docs/urca-poster-2025.pdf', meta: 'PDF' },
    ],
  },
  {
    slug: 'genesis-simulation',
    index: '03',
    eyebrow: 'Personal project · Controls & simulation',
    title: 'Genesis Drone Simulation',
    shortTitle: 'Genesis Simulation',
    role: 'Designer & Developer',
    organization: 'Independent project',
    dates: 'Aug 2025 — May 2026',
    summary:
      'Built a high-fidelity Python quadcopter simulation with real-time aerodynamics, rigid-body dynamics, autonomous modes, and GPU-parallel execution.',
    challenge:
      'Create a controllable virtual aircraft that behaves credibly across manual and autonomous flight while remaining fast enough for large-scale experimentation.',
    image: {
      base: 'genesis-drone-simulation', fallback: 'png', widths: [640, 1024, 1536], width: 1536, height: 1024,
      alt: 'Genesis physics-engine drone simulation visualization',
    },
    metrics: [
      { value: '> 1,000', label: 'Simulation steps per second on CUDA' },
      { value: '< 1 s', label: 'Controller settling time' },
      { value: 'MANUAL + AUTO', label: 'Flight modes implemented' },
    ],
    contributions: [
      'Modeled real-time aerodynamics, gravity, and rigid-body dynamics using the Genesis physics engine in Python.',
      'Designed and tuned PID controllers for altitude, attitude, and position hold with anti-windup.',
      'Implemented manual and autonomous flight modes with differential motor-RPM control.',
      'Scaled execution to parallel multi-environment simulation on CUDA and built custom visualization tools.',
    ],
    results: [
      'Achieved near-critical damping, sub-second settling times, and robust controller stability in the tested simulation scenarios.',
      'Exceeded 1,000 simulation steps per second during parallel CUDA execution.',
    ],
    tools: ['Python', 'Genesis', 'CUDA', 'PID control', 'Rigid-body dynamics', 'Visualization'],
    documents: [],
  },
];

export const archiveProjects: ArchiveProject[] = [
  {
    title: 'Liquid Propellant Rocket', category: 'Propulsion · Hardware', dates: 'Oct 2023 — May 2026',
    summary: 'Designed fluid-system components, a test stand, and P&IDs; performed hydrostatic proof testing, machined a graphite nozzle, and supported LOX/kerosene hot-fire tests.',
    image: { base: 'liquid-propellant-rocket', fallback: 'png', widths: [320, 539], width: 539, height: 299, alt: 'Liquid rocket engine hot-fire test' },
    tools: ['Propulsion', 'P&ID', 'CNC lathe', 'Proof testing'], documents: [],
  },
  {
    title: 'Computational Fluid Dynamics', category: 'Aerodynamics · Academic', dates: 'University of Alabama',
    summary: 'Modeled incompressible and compressible flows with turbulence models, boundary-layer analysis, mesh convergence, and post-processing in ANSYS Fluent.',
    image: { base: 'cfd-analysis', fallback: 'png', widths: [640, 1024, 1536], width: 1536, height: 1024, alt: 'Computational fluid dynamics visualization' },
    tools: ['ANSYS Fluent', 'Meshing', 'Turbulence', 'Post-processing'],
    documents: [{ label: 'Midterm', href: '/docs/cfd-midterm.pdf', meta: 'PDF' }, { label: 'Final', href: '/docs/cfd-final.pdf', meta: 'PDF' }],
  },
  {
    title: 'Flight Mechanics & Stability', category: 'Dynamics · Academic', dates: 'University of Alabama',
    summary: 'Analyzed longitudinal and lateral-directional stability, performance envelopes, dynamic response, and mission trajectories using MATLAB-based tools.',
    image: null,
    video: { mp4: '/media/flight-mechanics-mission.mp4', webm: '/media/flight-mechanics-mission.webm', poster: '/media/flight-mechanics-mission-poster.jpg', label: 'Flight mechanics mission trajectory animation' },
    tools: ['MATLAB', 'Stability', 'Dynamics', 'Mission analysis'], documents: [],
  },
  {
    title: 'Tensegrity Structure Design', category: 'Structures · Academic', dates: 'University of Alabama',
    summary: 'Designed, manufactured, and analyzed a stacked three-beam tensegrity column with SolidWorks, printed components, and FEA for a 5 lbf load case.',
    image: { base: 'tensegrity-structure', fallback: 'png', widths: [640, 816], width: 816, height: 629, alt: 'Stacked tensegrity structure prototype' },
    tools: ['SolidWorks', 'FEA', '3D printing', 'Statics'],
    documents: [{ label: 'Report', href: '/docs/tensegrity-project-report.pdf', meta: 'PDF' }, { label: 'Presentation', href: '/docs/tensegrity-project-presentation.pdf', meta: 'PDF' }],
  },
  {
    title: 'Bird-Strike Dent Analysis', category: 'Aerodynamics · Structures', dates: 'University of Alabama',
    summary: 'Evaluated aerodynamic penalties and structural deflection from a bird-strike dent on a STOL CH 750 rudder using thin-airfoil theory, beam modeling, and MATLAB.',
    image: { base: 'bird-strike-analysis', fallback: 'png', widths: [640, 1024, 1536], width: 1536, height: 1024, alt: 'Bird-strike rudder dent aerodynamic analysis' },
    tools: ['MATLAB', 'Thin-airfoil theory', 'FEA', 'Structures'],
    documents: [{ label: 'Project report', href: '/docs/bird-strike-project.pdf', meta: 'PDF' }],
  },
  {
    title: 'Airfoil Aerodynamic Analysis', category: 'Aerodynamics · Academic', dates: 'University of Alabama',
    summary: 'Computed lift, drag, and moment coefficients for the Liebeck LA2573A using XFLR5 and numerical integration of pressure and shear-stress distributions.',
    image: { base: 'airfoil-analysis', fallback: 'png', widths: [640, 1024, 1536], width: 1536, height: 1024, alt: 'Liebeck airfoil pressure and aerodynamic analysis' },
    tools: ['XFLR5', 'MATLAB', 'Excel', 'Thin-airfoil theory'],
    documents: [{ label: 'Project report', href: '/docs/airfoil-project.pdf', meta: 'PDF' }],
  },
];

export const capabilityGroups = [
  { title: 'Engineering & Design', items: ['SolidWorks', 'CATIA', 'CREO', 'ANSYS CFD / FEA', 'GD&T · ASME Y14.5', 'Systems engineering', 'Aerodynamic analysis'] },
  { title: 'Programming & Simulation', items: ['MATLAB', 'Python', 'Delphi 10', 'Genesis physics engine', 'CUDA workflows', 'Git / GitHub', 'Jira'] },
  { title: 'Manufacturing & Test', items: ['CNC mill & lathe', 'FDM / FFF printing', 'Resin printing', 'Waterjet cutting', 'Laser engraving', 'Composites', 'Wind-tunnel testing'] },
  { title: 'Team & Delivery', items: ['Technical leadership', 'Project management', 'Technical writing', 'Cross-team collaboration', 'Design reviews', 'Mentoring & training'] },
];

export const experiences: Experience[] = [
  {
    role: 'Mechanical Engineer I, Tactical Radars and Effectors', organization: 'Raytheon (RTX)', location: 'Tucson, AZ', dates: 'June 2026 — Present',
    summary: 'Support mechanical design and integration of the aft-section assembly for the Coyote counter-UAS effector platform — jet engine interface, fuel bladder assembly, and metal container structure.',
    bullets: [
      'Support mechanical design and integration of the aft-section assembly for the Coyote counter-UAS effector platform, including the jet engine interface, fuel bladder assembly, and metal container structure.',
      'Develop and revise CAD models and technical drawings per GD&T (ASME Y14.5-2018) standards for jet engine mounting, fuel bladder, and metal container hardware to support manufacturability and tolerance stack-up.',
      'Collaborate with cross-functional engineering teams across structures, integration, and manufacturing to support design reviews and production readiness on the Tactical Radars and Effectors program.',
    ],
  },
  {
    role: 'Lab Technician', organization: 'The Cube', location: 'Tuscaloosa, AL', dates: 'Aug 2025 — May 2026',
    summary: 'Operated and maintained advanced manufacturing equipment while helping students and faculty prepare manufacturable work.',
    bullets: [
      'Operated, maintained, and troubleshot FDM/FFF and resin printers, waterjet systems, and laser engravers.',
      'Printed engineering-grade Nylon, polycarbonate, carbon-fiber-reinforced, and specialty composite materials.',
      'Supported resin workflows from orientation and supports through washing, UV curing, and post-processing.',
      'Assisted with CAD preparation and slicing for additive and subtractive manufacturing.',
    ],
  },
  {
    role: 'Ranch Hand', organization: 'Trinity Farm', dates: 'May 2022 — Jan 2024',
    summary: 'Maintained farm operations, infrastructure, equipment, and daily animal care in changing field conditions.',
    bullets: ['Provided daily horse care including feeding, grooming, and medical assistance.', 'Maintained infrastructure through mowing, fence repair, and machinery troubleshooting.', 'Operated and maintained farm equipment and vehicles.'],
  },
  {
    role: 'Tire Technician', organization: 'National Tire and Battery', dates: 'Aug 2021 — Feb 2022',
    summary: 'Performed routine vehicle maintenance and assisted mechanics with diagnostics and repair work.',
    bullets: ['Performed oil changes, tire repairs, battery installations, and brake replacements.', 'Assisted mechanics with advanced repairs and diagnostics.', 'Explained repair needs to customers and maintained an organized work area.'],
  },
];

export const credentials: LinkItem[] = [
  { label: 'Resume', href: '/docs/fourie-van-rooyen-resume.pdf', meta: 'Experience, education & skills · PDF' },
  { label: 'Cover Letter', href: '/docs/fourie-van-rooyen-cover-letter.pdf', meta: 'Professional introduction · PDF' },
  { label: 'ORCA Project Documentation', href: '/docs/orca-project-documentation.pdf', meta: 'Complete capstone case study · PDF' },
  { label: 'Letter of Recommendation', href: '/docs/letter-of-recommendation.pdf', meta: 'A.A.E.R.O. team lead · PDF' },
  { label: 'Recommendation · Dr. Jinwei Shen', href: '/docs/recommendation-letter-jinwei-shen.pdf', meta: 'Associate Professor · PDF' },
  { label: 'URCA 2025 Research Poster', href: '/docs/urca-poster-2025.pdf', meta: 'Propeller research · PDF' },
];

export const education = {
  institution: 'The University of Alabama',
  location: 'Tuscaloosa, AL',
  degree: 'B.S. Aerospace Engineering',
  minor: 'Minor in Mechanical Engineering',
  date: 'May 2026',
  honors: "Dean's List · Fall 2025",
};

const validateSiteData = () => {
  const slugs = featuredMissions.map((mission) => mission.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error('Mission slugs must be unique.');
  if (featuredMissions.length !== 3) throw new Error('Exactly three featured missions are required.');
  for (const mission of featuredMissions) {
    if (!mission.title || !mission.summary || !mission.role || mission.metrics.length < 3) throw new Error(`Incomplete mission data: ${mission.slug}`);
  }
  const links = [...credentials, ...featuredMissions.flatMap((mission) => mission.documents), ...archiveProjects.flatMap((project) => project.documents)];
  for (const link of links) {
    if (!link.href.startsWith('/docs/') || !link.href.endsWith('.pdf')) throw new Error(`Invalid document path: ${link.href}`);
  }
};

validateSiteData();
