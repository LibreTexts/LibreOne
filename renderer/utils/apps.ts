import { Application } from '@server/types/applications';
import { useAxios } from '@renderer/useAxios';

/**
 *
 * @param {String} uuid - User's UUID
 * @returns {Promise<[Application[], Application[], Application[]]>} - Array of user's [applications, libraries, all libraries]
 */
async function getUserAppsAndLibraries(
  uuid: string,
): Promise<[Application[], Application[], Application[]]> {
  const apps: Application[] = [];
  const libsWithAccess: Application[] = [];
  const allLibs: Application[] = [];
  try {
    const axiosClient = useAxios();

    // Get all applications user has access to
    const allUserAppsPromise = axiosClient.get(`/users/${uuid}/applications`, {
      params: {
        onlyCASSupported: true,
      },
    });

    // Get all libraries regardless of access
    const allLibsPromise = axiosClient.get('/applications', {
      params: {
        type: 'library',
      },
    });

    const [appRes, libRes] = await Promise.all([allUserAppsPromise, allLibsPromise]);

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

    // Filter out libraries that user does not have access to
    const userApps = appRes.data.data.applications.filter((app: Application) => app.app_type === 'standalone');
    const userLibs = appRes.data.data.applications.filter((app: Application) => app.app_type === 'library');
    apps.push(...userApps);
    libsWithAccess.push(...userLibs);

    // Add all libraries to list of libraries
    allLibs.push(...libRes.data.data);
  } catch (err) {
    console.error(err);
  }
  return [apps, libsWithAccess, allLibs];
}

export { getUserAppsAndLibraries };
