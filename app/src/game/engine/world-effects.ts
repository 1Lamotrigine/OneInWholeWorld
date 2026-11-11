import { projectKinds, projectMetrics, type ProjectKind, type RegionMetric } from '../content/projects';
import type { RegionId } from '../content/world';
import type { GameState, RegionState } from '../types';
import { record } from './rules';

export function installProject(s: GameState, region: RegionId, kind: ProjectKind, years = 18) {
  const title = projectKinds[kind].name;
  s.world.projects = s.world.projects.filter(project => project.region !== region || project.kind !== kind);
  const project = {
    id: region + '-' + kind, region, kind, title, founder: s.character.name,
    started: s.world.year, until: s.world.year + years,
  };
  s.world.projects.push(project);
  if (s.world.projects.length > 48) s.world.projects.shift();
  record(s, 'project-' + kind, 'world', title, `Решение ${s.character.name} будет влиять на страну до ${project.until} года.`, 'neutral', true);
  return project;
}

export function countryModifiers(s: GameState, region: RegionId) {
  const metrics: Partial<Record<RegionMetric, number>> = {};
  const odds: Partial<Record<NonNullable<RegionState['crisis']>, number>> = {};
  for (const project of s.world.projects) {
    if (project.region !== region || project.until <= s.world.year) continue;
    for (const [key, value] of Object.entries(projectMetrics(project.kind))) {
      const metric = key as RegionMetric;
      metrics[metric] = (metrics[metric] ?? 0) + value;
    }
    const weights: Partial<Record<NonNullable<RegionState['crisis']>, number>> = projectKinds[project.kind].odds;
    for (const [key, value] of Object.entries(weights)) {
      const crisis = key as NonNullable<RegionState['crisis']>;
      odds[crisis] = (odds[crisis] ?? 1) * value;
    }
  }
  return { metrics, odds };
}
