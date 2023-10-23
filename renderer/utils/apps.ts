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

    const nonSupportedPromise = axiosClient.get('/applications', {
      params: {
        type: 'standalone',
      },
    });

    const [allAppRes, libRes, nonSupportedRes] = await Promise.all([
      allAppPromise,
      libPromise,
      nonSupportedPromise,
    ]);

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

    if (
      !nonSupportedRes.data ||
      !nonSupportedRes.data.data ||
      !Array.isArray(nonSupportedRes.data.data)
    ) {
      throw new Error('badres');
    }

    const nonSupportedApps = nonSupportedRes.data.data.filter(
      (app: Application) => app.supports_cas === false,
    );

    return [
      [...allAppRes.data.data.applications, ...nonSupportedApps],
      libRes.data.data,
    ];
  } catch (err) {
    console.error(err);
  }
  return [[], []];
}

export { getUserAppsAndLibraries };
