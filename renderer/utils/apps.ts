import { Application } from '@server/types/applications';
import { useAxios } from '@renderer/useAxios';

/**
 *
 * @param {String} uuid - User's UUID
 * @returns {Promise<[Application[], Application[]]>} - Array of user's [applications and libraries]
 */
async function getUserAppsAndLibraries(
  uuid: string,
): Promise<[Application[], Application[]]> {
  const apps: Application[] = [];
  const libs: Application[] = [];
  try {
    const axiosClient = useAxios();
    const appPromise = axiosClient.get(`/users/${uuid}/applications`, {
      params: {
        type: 'standalone',
      },
    });

    const libPromise = axiosClient.get('/applications', {
      params: {
        type: 'library',
      },
    });

    const [appRes, libRes] = await Promise.all([appPromise, libPromise]);

    if (
      !appRes.data ||
      !appRes.data.data.applications ||
      !Array.isArray(appRes.data.data.applications)
    ) {
      throw new Error('badres');
    }

    if (!libRes.data || !libRes.data.data || !Array.isArray(libRes.data.data)) {
      throw new Error('badres');
    }

    apps.push(...appRes.data.data.applications);
    libs.push(...libRes.data.data);
  } catch (err) {
    console.error(err);
  }
  return [apps, libs];
}

export { getUserAppsAndLibraries };
