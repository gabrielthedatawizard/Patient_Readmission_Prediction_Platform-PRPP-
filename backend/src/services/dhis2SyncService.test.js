jest.mock('../integrations/dhis2Client', () => ({
  fetchOrganisationUnits: jest.fn(),
  getDhis2Config: jest.fn()
}));

jest.mock('../data', () => ({
  upsertFacilitiesFromSync: jest.fn()
}));

const { fetchOrganisationUnits, getDhis2Config } = require('../integrations/dhis2Client');
const { upsertFacilitiesFromSync } = require('../data');
const { mapOrganisationUnitToFacility, syncDhis2Facilities } = require('./dhis2SyncService');

describe('dhis2SyncService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getDhis2Config.mockReturnValue({
      baseUrl: 'https://dhis2.example.org',
      username: 'sync-user',
      password: 'secret',
      rootOrgUnitId: 'ROOT',
      facilityLevels: [5],
      regionLevel: 2,
      districtLevel: 3,
      timeoutMs: 10000
    });
  });

  test('mapOrganisationUnitToFacility derives stable TRIP facility fields', () => {
    const mapped = mapOrganisationUnitToFacility(
      {
        id: 'ou-123',
        code: 'TZ-MNH-001',
        displayName: 'Muhimbili National Hospital',
        shortName: 'MNH',
        level: 5,
        parent: {
          id: 'dist-001',
          displayName: 'Ilala',
          level: 3
        },
        ancestors: [
          { id: 'ROOT', displayName: 'Tanzania', level: 1 },
          { id: 'reg-001', displayName: 'Dar es Salaam', code: 'DAR', level: 2 },
          { id: 'dist-001', displayName: 'Ilala', level: 3 }
        ]
      },
      {
        regionLevel: 2,
        districtLevel: 3,
        levelMapping: {}
      }
    );

    expect(mapped).toEqual(
      expect.objectContaining({
        id: 'FAC-DHIS2-TZ-MNH-001',
        name: 'Muhimbili National Hospital',
        level: 'national_referral',
        district: 'Ilala',
        regionCode: 'DAR',
        regionName: 'Dar es Salaam',
        dhis2OrgUnitId: 'ou-123',
        dhis2Code: 'TZ-MNH-001'
      })
    );
  });

  test('syncDhis2Facilities fetches DHIS2 org units and forwards mapped facilities to the data layer', async () => {
    fetchOrganisationUnits.mockResolvedValue([
      {
        id: 'ou-123',
        code: 'TZ-MNH-001',
        displayName: 'Muhimbili National Hospital',
        level: 5,
        parent: {
          id: 'dist-001',
          displayName: 'Ilala',
          level: 3
        },
        ancestors: [
          { id: 'ROOT', displayName: 'Tanzania', level: 1 },
          { id: 'reg-001', displayName: 'Dar es Salaam', code: 'DAR', level: 2 },
          { id: 'dist-001', displayName: 'Ilala', level: 3 }
        ]
      }
    ]);
    upsertFacilitiesFromSync.mockResolvedValue({
      total: 1,
      imported: 1,
      updated: 0,
      matchedByName: 0,
      facilities: [
        {
          id: 'FAC-DHIS2-TZ-MNH-001',
          name: 'Muhimbili National Hospital',
          regionCode: 'DAR',
          district: 'Ilala',
          level: 'national_referral',
          dhis2OrgUnitId: 'ou-123',
          dhis2Code: 'TZ-MNH-001'
        }
      ]
    });

    const result = await syncDhis2Facilities({
      dryRun: false,
      facilityLevels: [5]
    });

    expect(fetchOrganisationUnits).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: false,
        facilityLevels: [5]
      })
    );
    expect(upsertFacilitiesFromSync).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: 'FAC-DHIS2-TZ-MNH-001',
          name: 'Muhimbili National Hospital',
          regionCode: 'DAR',
          district: 'Ilala',
          dhis2OrgUnitId: 'ou-123'
        })
      ],
      { dryRun: false }
    );
    expect(result.summary).toEqual({
      sourceOrgUnitCount: 1,
      total: 1,
      imported: 1,
      updated: 0,
      matchedByName: 0
    });
    expect(result.dryRun).toBe(false);
  });
});
