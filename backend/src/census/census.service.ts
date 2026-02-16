import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * @service CensusService
 * @description Aggregates demographic data from verified citizens.
 *
 * Provides population statistics including:
 * - Total population by citizen type
 * - Gender distribution
 * - Age distribution (brackets)
 * - Ethnicity breakdown
 * - Regional distribution
 * - Growth trends (new registrations over time)
 */
@Injectable()
export class CensusService {
  private readonly logger = new Logger(CensusService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get overall population summary.
   */
  async getPopulationSummary() {
    this.logger.log('Generating population summary');

    const [
      totalPopulation,
      verifiedCitizens,
      residents,
      citizens,
      indigenous,
      foreigners,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.user.count({ where: { citizenType: 'RESIDENT' } }),
      this.prisma.user.count({ where: { citizenType: 'CITIZEN' } }),
      this.prisma.user.count({ where: { citizenType: 'INDIGENOUS' } }),
      this.prisma.user.count({ where: { citizenType: 'FOREIGNER' } }),
    ]);

    return {
      totalPopulation,
      verifiedCitizens,
      unverified: totalPopulation - verifiedCitizens,
      byCitizenType: {
        RESIDENT: residents,
        CITIZEN: citizens,
        INDIGENOUS: indigenous,
        FOREIGNER: foreigners,
      },
    };
  }

  /**
   * Get gender distribution.
   */
  async getGenderDistribution() {
    const [male, female, unspecified] = await Promise.all([
      this.prisma.user.count({ where: { gender: 'MALE' } }),
      this.prisma.user.count({ where: { gender: 'FEMALE' } }),
      this.prisma.user.count({ where: { gender: null } }),
    ]);

    return {
      MALE: male,
      FEMALE: female,
      UNSPECIFIED: unspecified,
      total: male + female + unspecified,
    };
  }

  /**
   * Get age distribution in brackets.
   */
  async getAgeDistribution() {
    const now = new Date();
    const users = await this.prisma.user.findMany({
      where: { dateOfBirth: { not: null } },
      select: { dateOfBirth: true },
    });

    const brackets = {
      '0-17': 0,
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56-65': 0,
      '65+': 0,
    };

    for (const user of users) {
      if (!user.dateOfBirth) continue;
      const age = Math.floor(
        (now.getTime() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      );

      if (age < 18) brackets['0-17']++;
      else if (age <= 25) brackets['18-25']++;
      else if (age <= 35) brackets['26-35']++;
      else if (age <= 45) brackets['36-45']++;
      else if (age <= 55) brackets['46-55']++;
      else if (age <= 65) brackets['56-65']++;
      else brackets['65+']++;
    }

    const withDob = users.length;
    const withoutDob = await this.prisma.user.count({ where: { dateOfBirth: null } });

    return {
      brackets,
      withDateOfBirth: withDob,
      withoutDateOfBirth: withoutDob,
    };
  }

  /**
   * Get ethnicity breakdown.
   */
  async getEthnicityDistribution() {
    const users = await this.prisma.user.findMany({
      where: { ethnicity: { isEmpty: false } },
      select: { ethnicity: true },
    });

    const counts: Record<string, number> = {};
    for (const user of users) {
      for (const eth of user.ethnicity) {
        counts[eth] = (counts[eth] || 0) + 1;
      }
    }

    // Sort by count descending
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([ethnicity, count]) => ({ ethnicity, count }));

    const withoutEthnicity = await this.prisma.user.count({
      where: { ethnicity: { isEmpty: true } },
    });

    return {
      ethnicities: sorted,
      withoutEthnicity,
      totalWithEthnicity: users.length,
    };
  }

  /**
   * Get registration growth over time (monthly).
   */
  async getRegistrationGrowth(months: number = 12) {
    const results: { month: string; count: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const count = await this.prisma.user.count({
        where: {
          createdAt: { gte: start, lt: end },
        },
      });

      results.push({
        month: start.toISOString().slice(0, 7), // YYYY-MM
        count,
      });
    }

    return results;
  }

  /**
   * Get full census report combining all demographics.
   */
  async getFullCensusReport() {
    const [population, gender, age, ethnicity, growth] = await Promise.all([
      this.getPopulationSummary(),
      this.getGenderDistribution(),
      this.getAgeDistribution(),
      this.getEthnicityDistribution(),
      this.getRegistrationGrowth(12),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      population,
      gender,
      age,
      ethnicity,
      registrationGrowth: growth,
    };
  }
}
