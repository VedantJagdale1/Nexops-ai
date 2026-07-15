import { useOutletContext } from 'react-router-dom';

import type { ProjectDto } from '@nexops/shared';

export function useProject(): ProjectDto {
  return useOutletContext<ProjectDto>();
}
