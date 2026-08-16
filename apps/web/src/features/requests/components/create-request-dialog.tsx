"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  CreateServiceRequestInputSchema,
  REQUEST_PRIORITIES,
  type CreateServiceRequestInput,
  type ServiceRequestDetail,
} from "@service-request-tracker/contracts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError } from "@/lib/http/api-error";

import { useCreateServiceRequest } from "../hooks/use-requests";
import { PRIORITY_LABELS } from "../lib/request-presentation";

interface CreateRequestDialogProps {
  onCreated: (request: ServiceRequestDetail) => void;
}

export function CreateRequestDialog({ onCreated }: CreateRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const createRequest = useCreateServiceRequest();
  const form = useForm<CreateServiceRequestInput>({
    defaultValues: { description: "", priority: "NORMAL", title: "" },
    resolver: zodResolver(CreateServiceRequestInputSchema),
  });

  const submit = form.handleSubmit((input) => {
    createRequest.mutate(input, {
      onSuccess: (request) => {
        form.reset();
        setOpen(false);
        onCreated(request);
      },
    });
  });
  const requestError =
    createRequest.error instanceof ApiClientError
      ? createRequest.error.message
      : createRequest.error === null
        ? null
        : "The request could not be created.";

  return (
    <Dialog
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          createRequest.reset();
        }
      }}
      open={open}
    >
      <DialogTrigger render={<Button size="lg" />}>
        <Plus aria-hidden="true" />
        New request
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form className="contents" noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Raise a service request</DialogTitle>
            <DialogDescription>
              Provide enough detail for an Agent to assess the issue quickly.
            </DialogDescription>
          </DialogHeader>

          {requestError === null ? null : (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertTitle>Request not created</AlertTitle>
              <AlertDescription>{requestError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="request-title">Title</Label>
            <Input
              {...form.register("title")}
              aria-invalid={form.formState.errors.title !== undefined}
              id="request-title"
              placeholder="Brief summary of the issue"
            />
            {form.formState.errors.title?.message === undefined ? null : (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="request-description">Description</Label>
            <Textarea
              {...form.register("description")}
              aria-invalid={form.formState.errors.description !== undefined}
              className="min-h-32 resize-y"
              id="request-description"
              placeholder="What happened, when it started, and who is affected?"
            />
            {form.formState.errors.description?.message === undefined ? null : (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="request-priority">Priority</Label>
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full" id="request-priority">
                    <SelectValue>{PRIORITY_LABELS[field.value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {PRIORITY_LABELS[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter>
            <Button
              disabled={createRequest.isPending}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={createRequest.isPending} type="submit">
              {createRequest.isPending ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : null}
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
