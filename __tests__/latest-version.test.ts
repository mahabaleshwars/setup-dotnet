import {DotnetVersionResolver} from '../src/installer';
import * as hc from '@actions/http-client';
import {QualityOptions} from '../src/setup-dotnet';
import * as core from '@actions/core';

// Mock http-client
jest.mock('@actions/http-client');

// Mock warning
const warningSpy = jest.spyOn(core, 'warning').mockImplementation(() => {});

describe('DotnetVersionResolver with latest', () => {
  let getJsonMock: jest.Mock;

  beforeEach(() => {
    getJsonMock = jest.fn();
    (hc.HttpClient as any).mockImplementation(() => {
      return {
        getJson: getJsonMock
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockReleases = {
    'releases-index': [
      {
        'channel-version': '10.0',
        'support-phase': 'preview',
        'release-type': 'sts'
      },
      {
        'channel-version': '9.0',
        'support-phase': 'active',
        'release-type': 'lts'
      },
      {
        'channel-version': '8.0',
        'support-phase': 'maintenance',
        'release-type': 'sts'
      },
      {
        'channel-version': '7.0',
        'support-phase': 'eol',
        'release-type': 'lts'
      }
    ]
  };

  it('should resolve "latest" to highest stable version by default', async () => {
    getJsonMock.mockResolvedValue({result: mockReleases});

    // 10.0 is preview, so it should be skipped.
    // 9.0 is active.
    // Expect 9.0.

    const resolver = new DotnetVersionResolver('latest');
    const version = await resolver.createDotnetVersion();

    expect(version.value).toBe('9.0');
    expect(version.type.toLowerCase()).toContain('channel');
    expect(version.qualityFlag).toBe(true);
  });

  it('should resolve "latest" to highest preview version if quality is preview', async () => {
    getJsonMock.mockResolvedValue({result: mockReleases});

    // Expect 10.0

    const resolver = new DotnetVersionResolver(
      'latest',
      'preview' as QualityOptions
    );
    const version = await resolver.createDotnetVersion();

    expect(version.value).toBe('10.0');
  });

  it('should resolve "latest" with channel filter LTS', async () => {
    getJsonMock.mockResolvedValue({result: mockReleases});

    // 10.0 (preview, sts) -> skipped? Wait 10.0 is sts.
    // 9.0 (lts).
    // Expect 9.0.

    const resolver = new DotnetVersionResolver(
      'latest',
      '' as QualityOptions,
      'LTS'
    );
    const version = await resolver.createDotnetVersion();

    expect(version.value).toBe('9.0');
  });

  it('should resolve "latest" with channel filter STS', async () => {
    getJsonMock.mockResolvedValue({result: mockReleases});

    // 10.0 (preview, sts) -> skipped (default quality).
    // 8.0 (maintenance, sts).
    // Expect 8.0.

    const resolver = new DotnetVersionResolver(
      'latest',
      '' as QualityOptions,
      'STS'
    );
    const version = await resolver.createDotnetVersion();

    expect(version.value).toBe('8.0');
  });

  it('should resolve "latest" with channel filter STS and preview quality', async () => {
    getJsonMock.mockResolvedValue({result: mockReleases});

    // 10.0 (preview, sts) -> included.
    // Expect 10.0.

    const resolver = new DotnetVersionResolver(
      'latest',
      'preview' as QualityOptions,
      'STS'
    );
    const version = await resolver.createDotnetVersion();

    expect(version.value).toBe('10.0');
  });

  it('should warn if channel is provided but version is not latest', async () => {
    getJsonMock.mockResolvedValue({result: mockReleases});

    const resolver = new DotnetVersionResolver(
      '8.0',
      '' as QualityOptions,
      'LTS'
    );
    await resolver.createDotnetVersion();

    expect(warningSpy).toHaveBeenCalledWith(expect.stringContaining('ignored'));
  });
});
