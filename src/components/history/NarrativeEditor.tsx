'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Chip,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  Image,
  Link2,
  Send,
  X,
  Calendar,
  MapPin,
  FileText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface TimelineEvent {
  id: string;
  title: string;
  date: Date;
  scope: string;
}

interface NarrativeEditorProps {
  scopeId: string;
  scope: 'INDIVIDUAL' | 'FAMILY' | 'CLAN' | 'TRIBE' | 'NATION';
  onSubmit: (data: NarrativeData) => Promise<void>;
  onCancel?: () => void;
  availableEvents?: TimelineEvent[];
}

export interface NarrativeData {
  title: string;
  content: string;
  linkedEventIds: string[];
  period?: {
    startDate: string;
    endDate: string;
  };
  tags?: string[];
}

export function NarrativeEditor({
  scopeId,
  scope,
  onSubmit,
  onCancel,
  availableEvents = [],
}: NarrativeEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkedEvents, setLinkedEvents] = useState<TimelineEvent[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [preview, setPreview] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleLinkEvent = (event: TimelineEvent) => {
    if (!linkedEvents.find((e) => e.id === event.id)) {
      setLinkedEvents([...linkedEvents, event]);
      
      // Auto-insert event reference in content
      const eventRef = `\n\n[📅 ${event.title}](event:${event.id})\n\n`;
      setContent(content + eventRef);
    }
    setEventDialogOpen(false);
  };

  const handleUnlinkEvent = (eventId: string) => {
    setLinkedEvents(linkedEvents.filter((e) => e.id !== eventId));
  };

  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      // TODO: Implement actual image upload to storage service
      // For now, create a placeholder markdown
      const imageUrl = URL.createObjectURL(file);
      const imageMarkdown = `\n\n![${file.name}](${imageUrl})\n\n`;
      setContent(content + imageMarkdown);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  }, [content]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        linkedEventIds: linkedEvents.map((e) => e.id),
        tags: tags.length > 0 ? tags : undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit narrative');
      throw err;
    }
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    setContent(newContent);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Создать историческую запись
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Title */}
      <TextField
        fullWidth
        label="Название"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        sx={{ mb: 2 }}
        placeholder="Например: Великий поход 1206 года"
      />

      {/* Toolbar */}
      <Paper variant="outlined" sx={{ p: 1, mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          size="small"
          startIcon={<FileText size={16} />}
          onClick={() => insertMarkdown('**', '**')}
        >
          Жирный
        </Button>
        <Button
          size="small"
          startIcon={<FileText size={16} />}
          onClick={() => insertMarkdown('*', '*')}
        >
          Курсив
        </Button>
        <Button
          size="small"
          startIcon={<FileText size={16} />}
          onClick={() => insertMarkdown('\n## ', '')}
        >
          Заголовок
        </Button>
        <Button
          size="small"
          startIcon={<Link2 size={16} />}
          onClick={() => insertMarkdown('[', '](url)')}
        >
          Ссылка
        </Button>
        <Button
          size="small"
          component="label"
          startIcon={<Image size={16} />}
          disabled={uploading}
        >
          {uploading ? 'Загрузка...' : 'Изображение'}
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={handleFileSelect}
          />
        </Button>
        <Button
          size="small"
          startIcon={<Calendar size={16} />}
          onClick={() => setEventDialogOpen(true)}
          disabled={availableEvents.length === 0}
        >
          Связать событие
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          variant={preview ? 'contained' : 'outlined'}
          onClick={() => setPreview(!preview)}
        >
          {preview ? 'Редактор' : 'Предпросмотр'}
        </Button>
      </Paper>

      {/* Content Editor / Preview */}
      {preview ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            minHeight: 300,
            maxHeight: 500,
            overflowY: 'auto',
            '& img': { maxWidth: '100%', height: 'auto' },
          }}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </Paper>
      ) : (
        <TextField
          fullWidth
          multiline
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Напишите историческую запись в формате Markdown...

Например:
# Великий поход

В **1206 году** Чингисхан объединил монгольские племена...

![Карта похода](image-url)

## Основные события
- Курултай на реке Онон
- Провозглашение Великого хана
"
          sx={{ mb: 2, fontFamily: 'monospace' }}
        />
      )}

      {/* Linked Events */}
      {linkedEvents.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Связанные события:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {linkedEvents.map((event) => (
              <Chip
                key={event.id}
                label={event.title}
                icon={<Calendar size={16} />}
                onDelete={() => handleUnlinkEvent(event.id)}
                size="small"
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Tags */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="Теги"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="Например: война, дипломатия"
            sx={{ flexGrow: 1 }}
          />
          <Button onClick={handleAddTag} disabled={!currentTag.trim()}>
            Добавить
          </Button>
        </Stack>
        {tags.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                size="small"
              />
            ))}
          </Stack>
        )}
      </Box>

      {/* Actions */}
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        {onCancel && (
          <Button onClick={onCancel} variant="outlined">
            Отмена
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<Send size={18} />}
          disabled={!title.trim() || !content.trim()}
        >
          Отправить на проверку
        </Button>
      </Stack>

      {/* Event Linking Dialog */}
      <Dialog
        open={eventDialogOpen}
        onClose={() => setEventDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Связать событие</DialogTitle>
        <DialogContent>
          {availableEvents.length === 0 ? (
            <Alert severity="info">Нет доступных событий для связывания</Alert>
          ) : (
            <List>
              {availableEvents.map((event) => (
                <ListItem
                  key={event.id}
                  disablePadding
                  secondaryAction={
                    linkedEvents.find((e) => e.id === event.id) ? (
                      <Chip label="Связано" size="small" color="primary" />
                    ) : null
                  }
                >
                  <ListItemButton
                    onClick={() => handleLinkEvent(event)}
                    disabled={!!linkedEvents.find((e) => e.id === event.id)}
                  >
                    <ListItemText
                      primary={event.title}
                      secondary={
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <Chip
                            icon={<Calendar size={12} />}
                            label={new Date(event.date).toLocaleDateString()}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            icon={<MapPin size={12} />}
                            label={event.scope}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
