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
  try {
    const axiosClient = useAxios();
    const allAppPromise = axiosClient.get(`/users/${uuid}/applications`);

    const libPromise = axiosClient.get('/applications', {
      params: {
        type: 'library',
      },
    });

    const [allAppRes, libRes] = await Promise.all([allAppPromise, libPromise]);

    if (
      !allAppRes.data ||
      !allAppRes.data.data.applications ||
      !Array.isArray(allAppRes.data.data.applications)
    ) {
      throw new Error('badres');
    }

    if (!libRes.data || !libRes.data.data || !Array.isArray(libRes.data.data)) {
      throw new Error('badres');
    }

    return [allAppRes.data.data.applications, libRes.data.data];
  } catch (err) {
    console.error(err);
  }
  return [[], []];
}

export { getUserAppsAndLibraries };
