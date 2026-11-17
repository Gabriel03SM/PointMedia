import { BadRequestException, Injectable } from '@nestjs/common';
import { TALENT_CONSENT_VERSION, type RegistrationResult } from '@pointmedia/shared';
import { PrismaService } from '../database/prisma.service';
import { UsersService, rethrowUnique } from '../users/users.service';
import { ProfilesService } from '../candidates/profiles.service';
import { ResumesService } from '../candidates/resumes.service';
import type { UploadedResume } from '../candidates/resume-validation';
import { ApplicationsService } from '../applications/applications.service';
import { TalentPoolService } from '../talent-pool/talent-pool.service';
import { PasswordService } from './password.service';
import type { RegistrationDto } from './registration.dto';

@Injectable()
export class CandidateRegistrationService {
  constructor(
    private readonly db: PrismaService,
    private readonly users: UsersService,
    private readonly profiles: ProfilesService,
    private readonly resumes: ResumesService,
    private readonly applications: ApplicationsService,
    private readonly talents: TalentPoolService,
    private readonly passwords: PasswordService,
  ) {}

  async submit(dto: RegistrationDto, file?: UploadedResume): Promise<RegistrationResult> {
    const bank = dto.talentConsentVersion === TALENT_CONSENT_VERSION;
    if (Boolean(dto.application) === bank)
      throw new BadRequestException(
        'Inscreva-se em uma vaga ou autorize a participação no banco de talentos.',
      );
    if (
      dto.profile.version !== 0 ||
      dto.profile.shareWithRecruiters ||
      dto.profile.name !== dto.name
    )
      throw new BadRequestException('Revise os dados iniciais da inscrição.');
    const passwordHash = await this.passwords.hash(dto.password);
    const prepared = file ? await this.resumes.prepareUpload(file) : undefined;
    try {
      return await this.db.$transaction(
        async (tx) => {
          const user = await this.users.register(dto, tx, passwordHash);
          await this.profiles.save(user.id, dto.profile, tx);
          if (prepared) await this.resumes.attachUpload(tx, user.id, prepared);
          const result = dto.application
            ? await this.applications.submit(user.id, dto.application, tx)
            : {
                outcome: 'TALENT_POOL' as const,
                application: null,
                talentConsent: await this.talents.grant(tx, user.id),
              };
          return { user: { ...user, phone: dto.profile.phone || null }, result };
        },
        { timeout: 15000 },
      );
    } catch (error) {
      if (prepared) await this.resumes.removeStored(prepared.storageKey);
      rethrowUnique(error);
    }
  }
}
