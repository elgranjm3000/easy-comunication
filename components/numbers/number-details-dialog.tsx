'use client';

import { useState } from 'react';
import { useData } from '@/lib/data-context';
import { NumberEntry, ProcessStage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, MessageSquare, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface NumberDetailsDialogProps {
  number: NumberEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NumberDetailsDialog({ number, open, onOpenChange }: NumberDetailsDialogProps) {
  const [newComment, setNewComment] = useState('');
  const [selectedStage, setSelectedStage] = useState<ProcessStage>(number.processStage);
  const { addComment, updateProcessStage } = useData();

  const handleAddComment = () => {
    if (newComment.trim()) {
      addComment(number.id, newComment);
      setNewComment('');
    }
  };

  const handleUpdateStage = () => {
    if (selectedStage !== number.processStage) {
      updateProcessStage(number.id, selectedStage);
    }
  };

  const getProcessStageColor = (stage: ProcessStage) => {
    const colors = {
      initial: 'bg-gray-500',
      'in-progress': 'bg-blue-500',
      review: 'bg-yellow-500',
      approval: 'bg-purple-500',
      completed: 'bg-green-500',
      rejected: 'bg-red-500'
    };
    return colors[stage];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Number Details: {number.numberRef}</span>
            <Badge variant="outline">{number.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Number Reference</Label>
                  <p className="font-medium">{number.numberRef}</p>
                </div>
                <div>
                  <Label>Assigned To</Label>
                  <p className="font-medium">{number.assignedTo}</p>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Badge className={
                    number.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    number.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    number.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {number.priority}
                  </Badge>
                </div>
                <div>
                  <Label>Start Date</Label>
                  <p className="font-medium">{format(new Date(number.startDate), 'PPP')}</p>
                </div>
                <div>
                  <Label>Last Updated</Label>
                  <p className="font-medium">{format(new Date(number.lastUpdated), 'PPpp')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Process Stage Update */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Update Process Stage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Stage</Label>
                  <Badge className={`${getProcessStageColor(number.processStage)} text-white`}>
                    {number.processStage.replace('-', ' ')}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label>New Stage</Label>
                  <Select value={selectedStage} onValueChange={(value: ProcessStage) => setSelectedStage(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial">Initial</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="approval">Approval</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleUpdateStage}
                  disabled={selectedStage === number.processStage}
                  className="w-full"
                >
                  Update Stage
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Timeline & Comments */}
          <div className="space-y-6">
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Process Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-4">
                    {number.timeline.map((event, index) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${getProcessStageColor(event.stage)}`} />
                          {index !== number.timeline.length - 1 && (
                            <div className="w-px h-8 bg-gray-200" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{event.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.timestamp), 'PPp')} by {event.user}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Comment */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleAddComment} disabled={!newComment.trim()} size="sm">
                    Add Comment
                  </Button>
                </div>

                <Separator />

                {/* Comments List */}
                <ScrollArea className="h-32">
                  <div className="space-y-3">
                    {number.comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No comments yet.</p>
                    ) : (
                      number.comments.map((comment) => (
                        <div key={comment.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{comment.author}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.timestamp), 'PPp')}
                            </span>
                          </div>
                          <p className="text-sm">{comment.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}