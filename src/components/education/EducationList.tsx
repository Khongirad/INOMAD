'use client';

import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Chip,
  Button,
  Avatar,
  Divider,
} from '@mui/material';
import { GraduationCap, CheckCircle, Clock, FileText, User } from 'lucide-react';

interface EducationVerification {
  id: string;
  type: 'DIPLOMA' | 'CERTIFICATE' | 'RECOMMENDATION';
  institution: string;
  fieldOfStudy: string;
  graduationYear?: number;
  documentUrl?: string;
  recommender?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  isVerified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
}

interface EducationListProps {
  educations: EducationVerification[];
  onAddNew?: () => void;
}

export function EducationList({ educations, onAddNew }: EducationListProps) {
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'DIPLOMA':
        return 'Диплом';
      case 'CERTIFICATE':
        return 'Сертификат';
      case 'RECOMMENDATION':
        return 'Рекомендация';
      default:
        return type;
    }
  };

  const getStatusColor = (isVerified: boolean) => {
    return isVerified ? 'success' : 'warning';
  };

  const getStatusLabel = (isVerified: boolean) => {
    return isVerified ? 'Подтверждено' : 'На проверке';
  };

  const getStatusIcon = (isVerified: boolean) => {
    return isVerified ? <CheckCircle size={16} /> : <Clock size={16} />;
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GraduationCap size={24} />
          Мое Образование
        </Typography>
        {onAddNew && (
          <Button variant="contained" onClick={onAddNew}>
            Добавить
          </Button>
        )}
      </Box>

      {educations.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" align="center">
              У вас пока нет подтвержденного образования.
              <br />
              Добавьте диплом, сертификат или получите рекомендацию специалиста.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {educations.map((edu) => (
            <Card key={edu.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h6">{edu.fieldOfStudy}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {edu.institution}
                      {edu.graduationYear && ` • ${edu.graduationYear}`}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Chip
                      label={getTypeLabel(edu.type)}
                      size="small"
                      icon={<FileText size={14} />}
                    />
                    <Chip
                      label={getStatusLabel(edu.isVerified)}
                      color={getStatusColor(edu.isVerified)}
                      size="small"
                      icon={getStatusIcon(edu.isVerified)}
                    />
                  </Box>
                </Box>

                {/* Recommender Info */}
                {edu.type === 'RECOMMENDATION' && edu.recommender && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <User size={16} />
                      <Typography variant="body2">
                        Рекомендовано:{' '}
                        <strong>
                          {edu.recommender.firstName} {edu.recommender.lastName}
                        </strong>{' '}
                        (@{edu.recommender.username})
                      </Typography>
                    </Box>
                  </>
                )}

                {/* Document Link */}
                {edu.documentUrl && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Button
                      variant="text"
                      size="small"
                      href={edu.documentUrl}
                      target="_blank"
                      startIcon={<FileText size={16} />}
                    >
                      Просмотреть Документ
                    </Button>
                  </>
                )}

                {/* Verification Date */}
                {edu.isVerified && edu.verifiedAt && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Подтверждено:{' '}
                    {new Date(edu.verifiedAt).toLocaleDateString('ru-RU')}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
