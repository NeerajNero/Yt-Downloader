import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  bigint: { input: any; output: any; }
  inet: { input: string; output: string; }
  jsonb: { input: unknown; output: unknown; }
  macaddr: { input: string; output: string; }
  timestamptz: { input: string; output: string; }
  uuid: { input: string; output: string; }
};

export type AnalyzeStyleOutput = {
  __typename?: 'AnalyzeStyleOutput';
  existing: Scalars['Boolean']['output'];
  job_id?: Maybe<Scalars['uuid']['output']>;
  style_id: Scalars['uuid']['output'];
};

/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export type Boolean_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  _gt?: InputMaybe<Scalars['Boolean']['input']>;
  _gte?: InputMaybe<Scalars['Boolean']['input']>;
  _in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Boolean']['input']>;
  _lte?: InputMaybe<Scalars['Boolean']['input']>;
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
  _nin?: InputMaybe<Array<Scalars['Boolean']['input']>>;
};

export type EnqueueOutput = {
  __typename?: 'EnqueueOutput';
  job_id: Scalars['uuid']['output'];
};

/** Boolean expression to compare columns of type "Float". All fields are combined with logical 'AND'. */
export type Float_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Float']['input']>;
  _gt?: InputMaybe<Scalars['Float']['input']>;
  _gte?: InputMaybe<Scalars['Float']['input']>;
  _in?: InputMaybe<Array<Scalars['Float']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Float']['input']>;
  _lte?: InputMaybe<Scalars['Float']['input']>;
  _neq?: InputMaybe<Scalars['Float']['input']>;
  _nin?: InputMaybe<Array<Scalars['Float']['input']>>;
};

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type Int_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Int']['input']>;
  _gt?: InputMaybe<Scalars['Int']['input']>;
  _gte?: InputMaybe<Scalars['Int']['input']>;
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Int']['input']>;
  _lte?: InputMaybe<Scalars['Int']['input']>;
  _neq?: InputMaybe<Scalars['Int']['input']>;
  _nin?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type ProbeResult = {
  __typename?: 'ProbeResult';
  duration?: Maybe<Scalars['Float']['output']>;
  existing_video_id?: Maybe<Scalars['uuid']['output']>;
  hdr: Scalars['Boolean']['output'];
  heights: Array<Scalars['Int']['output']>;
  thumbnail?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  uploader?: Maybe<Scalars['String']['output']>;
  webpage_url?: Maybe<Scalars['String']['output']>;
  youtube_id?: Maybe<Scalars['String']['output']>;
};

export type StartDownloadOutput = {
  __typename?: 'StartDownloadOutput';
  existing: Scalars['Boolean']['output'];
  job_id?: Maybe<Scalars['uuid']['output']>;
  video_id: Scalars['uuid']['output'];
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Array_Comparison_Exp = {
  /** is the array contained in the given array value */
  _contained_in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the array contain the given value */
  _contains?: InputMaybe<Array<Scalars['String']['input']>>;
  _eq?: InputMaybe<Array<Scalars['String']['input']>>;
  _gt?: InputMaybe<Array<Scalars['String']['input']>>;
  _gte?: InputMaybe<Array<Scalars['String']['input']>>;
  _in?: InputMaybe<Array<Array<Scalars['String']['input']>>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Array<Scalars['String']['input']>>;
  _lte?: InputMaybe<Array<Scalars['String']['input']>>;
  _neq?: InputMaybe<Array<Scalars['String']['input']>>;
  _nin?: InputMaybe<Array<Array<Scalars['String']['input']>>>;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['String']['input']>;
  _gt?: InputMaybe<Scalars['String']['input']>;
  _gte?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given case-insensitive pattern */
  _ilike?: InputMaybe<Scalars['String']['input']>;
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: InputMaybe<Scalars['String']['input']>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  /** does the column match the given pattern */
  _like?: InputMaybe<Scalars['String']['input']>;
  _lt?: InputMaybe<Scalars['String']['input']>;
  _lte?: InputMaybe<Scalars['String']['input']>;
  _neq?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: InputMaybe<Scalars['String']['input']>;
  _nin?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given pattern */
  _nlike?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given SQL regular expression */
  _similar?: InputMaybe<Scalars['String']['input']>;
};

export type WakeOutput = {
  __typename?: 'WakeOutput';
  message?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
};

/** columns and relationships of "assets" */
export type Assets = {
  __typename?: 'assets';
  created_at: Scalars['timestamptz']['output'];
  data?: Maybe<Scalars['jsonb']['output']>;
  id: Scalars['uuid']['output'];
  /** An object relationship */
  job?: Maybe<Jobs>;
  job_id?: Maybe<Scalars['uuid']['output']>;
  kind: Scalars['String']['output'];
  path?: Maybe<Scalars['String']['output']>;
  /** An object relationship */
  video: Videos;
  video_id: Scalars['uuid']['output'];
};


/** columns and relationships of "assets" */
export type AssetsDataArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "assets" */
export type Assets_Aggregate = {
  __typename?: 'assets_aggregate';
  aggregate?: Maybe<Assets_Aggregate_Fields>;
  nodes: Array<Assets>;
};

export type Assets_Aggregate_Bool_Exp = {
  count?: InputMaybe<Assets_Aggregate_Bool_Exp_Count>;
};

export type Assets_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Assets_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Assets_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "assets" */
export type Assets_Aggregate_Fields = {
  __typename?: 'assets_aggregate_fields';
  count: Scalars['Int']['output'];
  max?: Maybe<Assets_Max_Fields>;
  min?: Maybe<Assets_Min_Fields>;
};


/** aggregate fields of "assets" */
export type Assets_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Assets_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** order by aggregate values of table "assets" */
export type Assets_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Assets_Max_Order_By>;
  min?: InputMaybe<Assets_Min_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Assets_Append_Input = {
  data?: InputMaybe<Scalars['jsonb']['input']>;
};

/** input type for inserting array relation for remote table "assets" */
export type Assets_Arr_Rel_Insert_Input = {
  data: Array<Assets_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Assets_On_Conflict>;
};

/** Boolean expression to filter rows from the table "assets". All fields are combined with a logical 'AND'. */
export type Assets_Bool_Exp = {
  _and?: InputMaybe<Array<Assets_Bool_Exp>>;
  _not?: InputMaybe<Assets_Bool_Exp>;
  _or?: InputMaybe<Array<Assets_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  data?: InputMaybe<Jsonb_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  job?: InputMaybe<Jobs_Bool_Exp>;
  job_id?: InputMaybe<Uuid_Comparison_Exp>;
  kind?: InputMaybe<String_Comparison_Exp>;
  path?: InputMaybe<String_Comparison_Exp>;
  video?: InputMaybe<Videos_Bool_Exp>;
  video_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "assets" */
export enum Assets_Constraint {
  /** unique or primary key constraint on columns "id" */
  AssetsPkey = 'assets_pkey',
  /** unique or primary key constraint on columns "video_id", "kind" */
  AssetsVideoIdKindKey = 'assets_video_id_kind_key'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Assets_Delete_At_Path_Input = {
  data?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Assets_Delete_Elem_Input = {
  data?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Assets_Delete_Key_Input = {
  data?: InputMaybe<Scalars['String']['input']>;
};

/** input type for inserting data into table "assets" */
export type Assets_Insert_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  data?: InputMaybe<Scalars['jsonb']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  job?: InputMaybe<Jobs_Obj_Rel_Insert_Input>;
  job_id?: InputMaybe<Scalars['uuid']['input']>;
  kind?: InputMaybe<Scalars['String']['input']>;
  path?: InputMaybe<Scalars['String']['input']>;
  video?: InputMaybe<Videos_Obj_Rel_Insert_Input>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate max on columns */
export type Assets_Max_Fields = {
  __typename?: 'assets_max_fields';
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  job_id?: Maybe<Scalars['uuid']['output']>;
  kind?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  video_id?: Maybe<Scalars['uuid']['output']>;
};

/** order by max() on columns of table "assets" */
export type Assets_Max_Order_By = {
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  job_id?: InputMaybe<Order_By>;
  kind?: InputMaybe<Order_By>;
  path?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Assets_Min_Fields = {
  __typename?: 'assets_min_fields';
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  job_id?: Maybe<Scalars['uuid']['output']>;
  kind?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  video_id?: Maybe<Scalars['uuid']['output']>;
};

/** order by min() on columns of table "assets" */
export type Assets_Min_Order_By = {
  created_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  job_id?: InputMaybe<Order_By>;
  kind?: InputMaybe<Order_By>;
  path?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "assets" */
export type Assets_Mutation_Response = {
  __typename?: 'assets_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Assets>;
};

/** on_conflict condition type for table "assets" */
export type Assets_On_Conflict = {
  constraint: Assets_Constraint;
  update_columns?: Array<Assets_Update_Column>;
  where?: InputMaybe<Assets_Bool_Exp>;
};

/** Ordering options when selecting data from "assets". */
export type Assets_Order_By = {
  created_at?: InputMaybe<Order_By>;
  data?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  job?: InputMaybe<Jobs_Order_By>;
  job_id?: InputMaybe<Order_By>;
  kind?: InputMaybe<Order_By>;
  path?: InputMaybe<Order_By>;
  video?: InputMaybe<Videos_Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: assets */
export type Assets_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Assets_Prepend_Input = {
  data?: InputMaybe<Scalars['jsonb']['input']>;
};

/** select columns of table "assets" */
export enum Assets_Select_Column {
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Data = 'data',
  /** column name */
  Id = 'id',
  /** column name */
  JobId = 'job_id',
  /** column name */
  Kind = 'kind',
  /** column name */
  Path = 'path',
  /** column name */
  VideoId = 'video_id'
}

/** input type for updating data in table "assets" */
export type Assets_Set_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  data?: InputMaybe<Scalars['jsonb']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  job_id?: InputMaybe<Scalars['uuid']['input']>;
  kind?: InputMaybe<Scalars['String']['input']>;
  path?: InputMaybe<Scalars['String']['input']>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** Streaming cursor of the table "assets" */
export type Assets_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Assets_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Assets_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  data?: InputMaybe<Scalars['jsonb']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  job_id?: InputMaybe<Scalars['uuid']['input']>;
  kind?: InputMaybe<Scalars['String']['input']>;
  path?: InputMaybe<Scalars['String']['input']>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** update columns of table "assets" */
export enum Assets_Update_Column {
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Data = 'data',
  /** column name */
  Id = 'id',
  /** column name */
  JobId = 'job_id',
  /** column name */
  Kind = 'kind',
  /** column name */
  Path = 'path',
  /** column name */
  VideoId = 'video_id'
}

export type Assets_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Assets_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Assets_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Assets_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Assets_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Assets_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Assets_Set_Input>;
  /** filter the rows which have to be updated */
  where: Assets_Bool_Exp;
};

/** Boolean expression to compare columns of type "bigint". All fields are combined with logical 'AND'. */
export type Bigint_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['bigint']['input']>;
  _gt?: InputMaybe<Scalars['bigint']['input']>;
  _gte?: InputMaybe<Scalars['bigint']['input']>;
  _in?: InputMaybe<Array<Scalars['bigint']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['bigint']['input']>;
  _lte?: InputMaybe<Scalars['bigint']['input']>;
  _neq?: InputMaybe<Scalars['bigint']['input']>;
  _nin?: InputMaybe<Array<Scalars['bigint']['input']>>;
};

/** columns and relationships of "clips" */
export type Clips = {
  __typename?: 'clips';
  created_at: Scalars['timestamptz']['output'];
  end_s: Scalars['Float']['output'];
  hook?: Maybe<Scalars['String']['output']>;
  id: Scalars['uuid']['output'];
  /** An object relationship */
  job?: Maybe<Jobs>;
  job_id?: Maybe<Scalars['uuid']['output']>;
  /** An array relationship */
  jobs: Array<Jobs>;
  /** An aggregate relationship */
  jobs_aggregate: Jobs_Aggregate;
  origin: Scalars['String']['output'];
  output_path?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  /** An object relationship */
  recipe?: Maybe<Recipes>;
  recipe_id?: Maybe<Scalars['uuid']['output']>;
  render_settings?: Maybe<Scalars['jsonb']['output']>;
  start_s: Scalars['Float']['output'];
  status: Scalars['String']['output'];
  title?: Maybe<Scalars['String']['output']>;
  updated_at: Scalars['timestamptz']['output'];
  /** An object relationship */
  video: Videos;
  video_id: Scalars['uuid']['output'];
};


/** columns and relationships of "clips" */
export type ClipsJobsArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


/** columns and relationships of "clips" */
export type ClipsJobs_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


/** columns and relationships of "clips" */
export type ClipsRender_SettingsArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "clips" */
export type Clips_Aggregate = {
  __typename?: 'clips_aggregate';
  aggregate?: Maybe<Clips_Aggregate_Fields>;
  nodes: Array<Clips>;
};

export type Clips_Aggregate_Bool_Exp = {
  count?: InputMaybe<Clips_Aggregate_Bool_Exp_Count>;
};

export type Clips_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Clips_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Clips_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "clips" */
export type Clips_Aggregate_Fields = {
  __typename?: 'clips_aggregate_fields';
  avg?: Maybe<Clips_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Clips_Max_Fields>;
  min?: Maybe<Clips_Min_Fields>;
  stddev?: Maybe<Clips_Stddev_Fields>;
  stddev_pop?: Maybe<Clips_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Clips_Stddev_Samp_Fields>;
  sum?: Maybe<Clips_Sum_Fields>;
  var_pop?: Maybe<Clips_Var_Pop_Fields>;
  var_samp?: Maybe<Clips_Var_Samp_Fields>;
  variance?: Maybe<Clips_Variance_Fields>;
};


/** aggregate fields of "clips" */
export type Clips_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Clips_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** order by aggregate values of table "clips" */
export type Clips_Aggregate_Order_By = {
  avg?: InputMaybe<Clips_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Clips_Max_Order_By>;
  min?: InputMaybe<Clips_Min_Order_By>;
  stddev?: InputMaybe<Clips_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Clips_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Clips_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Clips_Sum_Order_By>;
  var_pop?: InputMaybe<Clips_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Clips_Var_Samp_Order_By>;
  variance?: InputMaybe<Clips_Variance_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Clips_Append_Input = {
  render_settings?: InputMaybe<Scalars['jsonb']['input']>;
};

/** input type for inserting array relation for remote table "clips" */
export type Clips_Arr_Rel_Insert_Input = {
  data: Array<Clips_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Clips_On_Conflict>;
};

/** aggregate avg on columns */
export type Clips_Avg_Fields = {
  __typename?: 'clips_avg_fields';
  end_s?: Maybe<Scalars['Float']['output']>;
  start_s?: Maybe<Scalars['Float']['output']>;
};

/** order by avg() on columns of table "clips" */
export type Clips_Avg_Order_By = {
  end_s?: InputMaybe<Order_By>;
  start_s?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "clips". All fields are combined with a logical 'AND'. */
export type Clips_Bool_Exp = {
  _and?: InputMaybe<Array<Clips_Bool_Exp>>;
  _not?: InputMaybe<Clips_Bool_Exp>;
  _or?: InputMaybe<Array<Clips_Bool_Exp>>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  end_s?: InputMaybe<Float_Comparison_Exp>;
  hook?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  job?: InputMaybe<Jobs_Bool_Exp>;
  job_id?: InputMaybe<Uuid_Comparison_Exp>;
  jobs?: InputMaybe<Jobs_Bool_Exp>;
  jobs_aggregate?: InputMaybe<Jobs_Aggregate_Bool_Exp>;
  origin?: InputMaybe<String_Comparison_Exp>;
  output_path?: InputMaybe<String_Comparison_Exp>;
  reason?: InputMaybe<String_Comparison_Exp>;
  recipe?: InputMaybe<Recipes_Bool_Exp>;
  recipe_id?: InputMaybe<Uuid_Comparison_Exp>;
  render_settings?: InputMaybe<Jsonb_Comparison_Exp>;
  start_s?: InputMaybe<Float_Comparison_Exp>;
  status?: InputMaybe<String_Comparison_Exp>;
  title?: InputMaybe<String_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  video?: InputMaybe<Videos_Bool_Exp>;
  video_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "clips" */
export enum Clips_Constraint {
  /** unique or primary key constraint on columns "id" */
  ClipsPkey = 'clips_pkey'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Clips_Delete_At_Path_Input = {
  render_settings?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Clips_Delete_Elem_Input = {
  render_settings?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Clips_Delete_Key_Input = {
  render_settings?: InputMaybe<Scalars['String']['input']>;
};

/** input type for incrementing numeric columns in table "clips" */
export type Clips_Inc_Input = {
  end_s?: InputMaybe<Scalars['Float']['input']>;
  start_s?: InputMaybe<Scalars['Float']['input']>;
};

/** input type for inserting data into table "clips" */
export type Clips_Insert_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  end_s?: InputMaybe<Scalars['Float']['input']>;
  hook?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  job?: InputMaybe<Jobs_Obj_Rel_Insert_Input>;
  job_id?: InputMaybe<Scalars['uuid']['input']>;
  jobs?: InputMaybe<Jobs_Arr_Rel_Insert_Input>;
  origin?: InputMaybe<Scalars['String']['input']>;
  output_path?: InputMaybe<Scalars['String']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  recipe?: InputMaybe<Recipes_Obj_Rel_Insert_Input>;
  recipe_id?: InputMaybe<Scalars['uuid']['input']>;
  render_settings?: InputMaybe<Scalars['jsonb']['input']>;
  start_s?: InputMaybe<Scalars['Float']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  video?: InputMaybe<Videos_Obj_Rel_Insert_Input>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate max on columns */
export type Clips_Max_Fields = {
  __typename?: 'clips_max_fields';
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  end_s?: Maybe<Scalars['Float']['output']>;
  hook?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  job_id?: Maybe<Scalars['uuid']['output']>;
  origin?: Maybe<Scalars['String']['output']>;
  output_path?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  recipe_id?: Maybe<Scalars['uuid']['output']>;
  start_s?: Maybe<Scalars['Float']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['timestamptz']['output']>;
  video_id?: Maybe<Scalars['uuid']['output']>;
};

/** order by max() on columns of table "clips" */
export type Clips_Max_Order_By = {
  created_at?: InputMaybe<Order_By>;
  end_s?: InputMaybe<Order_By>;
  hook?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  job_id?: InputMaybe<Order_By>;
  origin?: InputMaybe<Order_By>;
  output_path?: InputMaybe<Order_By>;
  reason?: InputMaybe<Order_By>;
  recipe_id?: InputMaybe<Order_By>;
  start_s?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Clips_Min_Fields = {
  __typename?: 'clips_min_fields';
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  end_s?: Maybe<Scalars['Float']['output']>;
  hook?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  job_id?: Maybe<Scalars['uuid']['output']>;
  origin?: Maybe<Scalars['String']['output']>;
  output_path?: Maybe<Scalars['String']['output']>;
  reason?: Maybe<Scalars['String']['output']>;
  recipe_id?: Maybe<Scalars['uuid']['output']>;
  start_s?: Maybe<Scalars['Float']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['timestamptz']['output']>;
  video_id?: Maybe<Scalars['uuid']['output']>;
};

/** order by min() on columns of table "clips" */
export type Clips_Min_Order_By = {
  created_at?: InputMaybe<Order_By>;
  end_s?: InputMaybe<Order_By>;
  hook?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  job_id?: InputMaybe<Order_By>;
  origin?: InputMaybe<Order_By>;
  output_path?: InputMaybe<Order_By>;
  reason?: InputMaybe<Order_By>;
  recipe_id?: InputMaybe<Order_By>;
  start_s?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "clips" */
export type Clips_Mutation_Response = {
  __typename?: 'clips_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Clips>;
};

/** input type for inserting object relation for remote table "clips" */
export type Clips_Obj_Rel_Insert_Input = {
  data: Clips_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Clips_On_Conflict>;
};

/** on_conflict condition type for table "clips" */
export type Clips_On_Conflict = {
  constraint: Clips_Constraint;
  update_columns?: Array<Clips_Update_Column>;
  where?: InputMaybe<Clips_Bool_Exp>;
};

/** Ordering options when selecting data from "clips". */
export type Clips_Order_By = {
  created_at?: InputMaybe<Order_By>;
  end_s?: InputMaybe<Order_By>;
  hook?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  job?: InputMaybe<Jobs_Order_By>;
  job_id?: InputMaybe<Order_By>;
  jobs_aggregate?: InputMaybe<Jobs_Aggregate_Order_By>;
  origin?: InputMaybe<Order_By>;
  output_path?: InputMaybe<Order_By>;
  reason?: InputMaybe<Order_By>;
  recipe?: InputMaybe<Recipes_Order_By>;
  recipe_id?: InputMaybe<Order_By>;
  render_settings?: InputMaybe<Order_By>;
  start_s?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  video?: InputMaybe<Videos_Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: clips */
export type Clips_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Clips_Prepend_Input = {
  render_settings?: InputMaybe<Scalars['jsonb']['input']>;
};

/** select columns of table "clips" */
export enum Clips_Select_Column {
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  EndS = 'end_s',
  /** column name */
  Hook = 'hook',
  /** column name */
  Id = 'id',
  /** column name */
  JobId = 'job_id',
  /** column name */
  Origin = 'origin',
  /** column name */
  OutputPath = 'output_path',
  /** column name */
  Reason = 'reason',
  /** column name */
  RecipeId = 'recipe_id',
  /** column name */
  RenderSettings = 'render_settings',
  /** column name */
  StartS = 'start_s',
  /** column name */
  Status = 'status',
  /** column name */
  Title = 'title',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  VideoId = 'video_id'
}

/** input type for updating data in table "clips" */
export type Clips_Set_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  end_s?: InputMaybe<Scalars['Float']['input']>;
  hook?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  job_id?: InputMaybe<Scalars['uuid']['input']>;
  origin?: InputMaybe<Scalars['String']['input']>;
  output_path?: InputMaybe<Scalars['String']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  recipe_id?: InputMaybe<Scalars['uuid']['input']>;
  render_settings?: InputMaybe<Scalars['jsonb']['input']>;
  start_s?: InputMaybe<Scalars['Float']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate stddev on columns */
export type Clips_Stddev_Fields = {
  __typename?: 'clips_stddev_fields';
  end_s?: Maybe<Scalars['Float']['output']>;
  start_s?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev() on columns of table "clips" */
export type Clips_Stddev_Order_By = {
  end_s?: InputMaybe<Order_By>;
  start_s?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Clips_Stddev_Pop_Fields = {
  __typename?: 'clips_stddev_pop_fields';
  end_s?: Maybe<Scalars['Float']['output']>;
  start_s?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev_pop() on columns of table "clips" */
export type Clips_Stddev_Pop_Order_By = {
  end_s?: InputMaybe<Order_By>;
  start_s?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Clips_Stddev_Samp_Fields = {
  __typename?: 'clips_stddev_samp_fields';
  end_s?: Maybe<Scalars['Float']['output']>;
  start_s?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev_samp() on columns of table "clips" */
export type Clips_Stddev_Samp_Order_By = {
  end_s?: InputMaybe<Order_By>;
  start_s?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "clips" */
export type Clips_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Clips_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Clips_Stream_Cursor_Value_Input = {
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  end_s?: InputMaybe<Scalars['Float']['input']>;
  hook?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  job_id?: InputMaybe<Scalars['uuid']['input']>;
  origin?: InputMaybe<Scalars['String']['input']>;
  output_path?: InputMaybe<Scalars['String']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  recipe_id?: InputMaybe<Scalars['uuid']['input']>;
  render_settings?: InputMaybe<Scalars['jsonb']['input']>;
  start_s?: InputMaybe<Scalars['Float']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate sum on columns */
export type Clips_Sum_Fields = {
  __typename?: 'clips_sum_fields';
  end_s?: Maybe<Scalars['Float']['output']>;
  start_s?: Maybe<Scalars['Float']['output']>;
};

/** order by sum() on columns of table "clips" */
export type Clips_Sum_Order_By = {
  end_s?: InputMaybe<Order_By>;
  start_s?: InputMaybe<Order_By>;
};

/** update columns of table "clips" */
export enum Clips_Update_Column {
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  EndS = 'end_s',
  /** column name */
  Hook = 'hook',
  /** column name */
  Id = 'id',
  /** column name */
  JobId = 'job_id',
  /** column name */
  Origin = 'origin',
  /** column name */
  OutputPath = 'output_path',
  /** column name */
  Reason = 'reason',
  /** column name */
  RecipeId = 'recipe_id',
  /** column name */
  RenderSettings = 'render_settings',
  /** column name */
  StartS = 'start_s',
  /** column name */
  Status = 'status',
  /** column name */
  Title = 'title',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  VideoId = 'video_id'
}

export type Clips_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Clips_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Clips_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Clips_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Clips_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Clips_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Clips_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Clips_Set_Input>;
  /** filter the rows which have to be updated */
  where: Clips_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Clips_Var_Pop_Fields = {
  __typename?: 'clips_var_pop_fields';
  end_s?: Maybe<Scalars['Float']['output']>;
  start_s?: Maybe<Scalars['Float']['output']>;
};

/** order by var_pop() on columns of table "clips" */
export type Clips_Var_Pop_Order_By = {
  end_s?: InputMaybe<Order_By>;
  start_s?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Clips_Var_Samp_Fields = {
  __typename?: 'clips_var_samp_fields';
  end_s?: Maybe<Scalars['Float']['output']>;
  start_s?: Maybe<Scalars['Float']['output']>;
};

/** order by var_samp() on columns of table "clips" */
export type Clips_Var_Samp_Order_By = {
  end_s?: InputMaybe<Order_By>;
  start_s?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Clips_Variance_Fields = {
  __typename?: 'clips_variance_fields';
  end_s?: Maybe<Scalars['Float']['output']>;
  start_s?: Maybe<Scalars['Float']['output']>;
};

/** order by variance() on columns of table "clips" */
export type Clips_Variance_Order_By = {
  end_s?: InputMaybe<Order_By>;
  start_s?: InputMaybe<Order_By>;
};

/** ordering argument of a cursor */
export enum Cursor_Ordering {
  /** ascending ordering of the cursor */
  Asc = 'ASC',
  /** descending ordering of the cursor */
  Desc = 'DESC'
}

/** Boolean expression to compare columns of type "inet". All fields are combined with logical 'AND'. */
export type Inet_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['inet']['input']>;
  _gt?: InputMaybe<Scalars['inet']['input']>;
  _gte?: InputMaybe<Scalars['inet']['input']>;
  _in?: InputMaybe<Array<Scalars['inet']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['inet']['input']>;
  _lte?: InputMaybe<Scalars['inet']['input']>;
  _neq?: InputMaybe<Scalars['inet']['input']>;
  _nin?: InputMaybe<Array<Scalars['inet']['input']>>;
};

/** columns and relationships of "jobs" */
export type Jobs = {
  __typename?: 'jobs';
  /** An array relationship */
  assets: Array<Assets>;
  /** An aggregate relationship */
  assets_aggregate: Assets_Aggregate;
  attempts: Scalars['Int']['output'];
  /** An array relationship */
  child_jobs: Array<Jobs>;
  /** An aggregate relationship */
  child_jobs_aggregate: Jobs_Aggregate;
  claimed_at?: Maybe<Scalars['timestamptz']['output']>;
  claimed_by?: Maybe<Scalars['uuid']['output']>;
  /** An object relationship */
  clip?: Maybe<Clips>;
  clip_id?: Maybe<Scalars['uuid']['output']>;
  created_at: Scalars['timestamptz']['output'];
  error?: Maybe<Scalars['String']['output']>;
  heartbeat_at?: Maybe<Scalars['timestamptz']['output']>;
  id: Scalars['uuid']['output'];
  /** An object relationship */
  machine?: Maybe<Machines>;
  max_attempts: Scalars['Int']['output'];
  /** An object relationship */
  parent_job?: Maybe<Jobs>;
  parent_job_id?: Maybe<Scalars['uuid']['output']>;
  payload: Scalars['jsonb']['output'];
  priority: Scalars['Int']['output'];
  progress?: Maybe<Scalars['Float']['output']>;
  progress_note?: Maybe<Scalars['String']['output']>;
  result?: Maybe<Scalars['jsonb']['output']>;
  run_after: Scalars['timestamptz']['output'];
  status: Scalars['String']['output'];
  type: Scalars['String']['output'];
  updated_at: Scalars['timestamptz']['output'];
  /** An object relationship */
  video?: Maybe<Videos>;
  video_id?: Maybe<Scalars['uuid']['output']>;
};


/** columns and relationships of "jobs" */
export type JobsAssetsArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


/** columns and relationships of "jobs" */
export type JobsAssets_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


/** columns and relationships of "jobs" */
export type JobsChild_JobsArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


/** columns and relationships of "jobs" */
export type JobsChild_Jobs_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


/** columns and relationships of "jobs" */
export type JobsPayloadArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};


/** columns and relationships of "jobs" */
export type JobsResultArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "jobs" */
export type Jobs_Aggregate = {
  __typename?: 'jobs_aggregate';
  aggregate?: Maybe<Jobs_Aggregate_Fields>;
  nodes: Array<Jobs>;
};

export type Jobs_Aggregate_Bool_Exp = {
  count?: InputMaybe<Jobs_Aggregate_Bool_Exp_Count>;
};

export type Jobs_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Jobs_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Jobs_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "jobs" */
export type Jobs_Aggregate_Fields = {
  __typename?: 'jobs_aggregate_fields';
  avg?: Maybe<Jobs_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Jobs_Max_Fields>;
  min?: Maybe<Jobs_Min_Fields>;
  stddev?: Maybe<Jobs_Stddev_Fields>;
  stddev_pop?: Maybe<Jobs_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Jobs_Stddev_Samp_Fields>;
  sum?: Maybe<Jobs_Sum_Fields>;
  var_pop?: Maybe<Jobs_Var_Pop_Fields>;
  var_samp?: Maybe<Jobs_Var_Samp_Fields>;
  variance?: Maybe<Jobs_Variance_Fields>;
};


/** aggregate fields of "jobs" */
export type Jobs_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Jobs_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** order by aggregate values of table "jobs" */
export type Jobs_Aggregate_Order_By = {
  avg?: InputMaybe<Jobs_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Jobs_Max_Order_By>;
  min?: InputMaybe<Jobs_Min_Order_By>;
  stddev?: InputMaybe<Jobs_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Jobs_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Jobs_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Jobs_Sum_Order_By>;
  var_pop?: InputMaybe<Jobs_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Jobs_Var_Samp_Order_By>;
  variance?: InputMaybe<Jobs_Variance_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Jobs_Append_Input = {
  payload?: InputMaybe<Scalars['jsonb']['input']>;
  result?: InputMaybe<Scalars['jsonb']['input']>;
};

/** input type for inserting array relation for remote table "jobs" */
export type Jobs_Arr_Rel_Insert_Input = {
  data: Array<Jobs_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Jobs_On_Conflict>;
};

/** aggregate avg on columns */
export type Jobs_Avg_Fields = {
  __typename?: 'jobs_avg_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by avg() on columns of table "jobs" */
export type Jobs_Avg_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "jobs". All fields are combined with a logical 'AND'. */
export type Jobs_Bool_Exp = {
  _and?: InputMaybe<Array<Jobs_Bool_Exp>>;
  _not?: InputMaybe<Jobs_Bool_Exp>;
  _or?: InputMaybe<Array<Jobs_Bool_Exp>>;
  assets?: InputMaybe<Assets_Bool_Exp>;
  assets_aggregate?: InputMaybe<Assets_Aggregate_Bool_Exp>;
  attempts?: InputMaybe<Int_Comparison_Exp>;
  child_jobs?: InputMaybe<Jobs_Bool_Exp>;
  child_jobs_aggregate?: InputMaybe<Jobs_Aggregate_Bool_Exp>;
  claimed_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  claimed_by?: InputMaybe<Uuid_Comparison_Exp>;
  clip?: InputMaybe<Clips_Bool_Exp>;
  clip_id?: InputMaybe<Uuid_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  error?: InputMaybe<String_Comparison_Exp>;
  heartbeat_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  machine?: InputMaybe<Machines_Bool_Exp>;
  max_attempts?: InputMaybe<Int_Comparison_Exp>;
  parent_job?: InputMaybe<Jobs_Bool_Exp>;
  parent_job_id?: InputMaybe<Uuid_Comparison_Exp>;
  payload?: InputMaybe<Jsonb_Comparison_Exp>;
  priority?: InputMaybe<Int_Comparison_Exp>;
  progress?: InputMaybe<Float_Comparison_Exp>;
  progress_note?: InputMaybe<String_Comparison_Exp>;
  result?: InputMaybe<Jsonb_Comparison_Exp>;
  run_after?: InputMaybe<Timestamptz_Comparison_Exp>;
  status?: InputMaybe<String_Comparison_Exp>;
  type?: InputMaybe<String_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  video?: InputMaybe<Videos_Bool_Exp>;
  video_id?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "jobs" */
export enum Jobs_Constraint {
  /** unique or primary key constraint on columns "id" */
  JobsPkey = 'jobs_pkey'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Jobs_Delete_At_Path_Input = {
  payload?: InputMaybe<Array<Scalars['String']['input']>>;
  result?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Jobs_Delete_Elem_Input = {
  payload?: InputMaybe<Scalars['Int']['input']>;
  result?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Jobs_Delete_Key_Input = {
  payload?: InputMaybe<Scalars['String']['input']>;
  result?: InputMaybe<Scalars['String']['input']>;
};

/** input type for incrementing numeric columns in table "jobs" */
export type Jobs_Inc_Input = {
  attempts?: InputMaybe<Scalars['Int']['input']>;
  max_attempts?: InputMaybe<Scalars['Int']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  progress?: InputMaybe<Scalars['Float']['input']>;
};

/** input type for inserting data into table "jobs" */
export type Jobs_Insert_Input = {
  assets?: InputMaybe<Assets_Arr_Rel_Insert_Input>;
  attempts?: InputMaybe<Scalars['Int']['input']>;
  child_jobs?: InputMaybe<Jobs_Arr_Rel_Insert_Input>;
  claimed_at?: InputMaybe<Scalars['timestamptz']['input']>;
  claimed_by?: InputMaybe<Scalars['uuid']['input']>;
  clip?: InputMaybe<Clips_Obj_Rel_Insert_Input>;
  clip_id?: InputMaybe<Scalars['uuid']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  error?: InputMaybe<Scalars['String']['input']>;
  heartbeat_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  machine?: InputMaybe<Machines_Obj_Rel_Insert_Input>;
  max_attempts?: InputMaybe<Scalars['Int']['input']>;
  parent_job?: InputMaybe<Jobs_Obj_Rel_Insert_Input>;
  parent_job_id?: InputMaybe<Scalars['uuid']['input']>;
  payload?: InputMaybe<Scalars['jsonb']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  progress?: InputMaybe<Scalars['Float']['input']>;
  progress_note?: InputMaybe<Scalars['String']['input']>;
  result?: InputMaybe<Scalars['jsonb']['input']>;
  run_after?: InputMaybe<Scalars['timestamptz']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  video?: InputMaybe<Videos_Obj_Rel_Insert_Input>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate max on columns */
export type Jobs_Max_Fields = {
  __typename?: 'jobs_max_fields';
  attempts?: Maybe<Scalars['Int']['output']>;
  claimed_at?: Maybe<Scalars['timestamptz']['output']>;
  claimed_by?: Maybe<Scalars['uuid']['output']>;
  clip_id?: Maybe<Scalars['uuid']['output']>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  heartbeat_at?: Maybe<Scalars['timestamptz']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  max_attempts?: Maybe<Scalars['Int']['output']>;
  parent_job_id?: Maybe<Scalars['uuid']['output']>;
  priority?: Maybe<Scalars['Int']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
  progress_note?: Maybe<Scalars['String']['output']>;
  run_after?: Maybe<Scalars['timestamptz']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['timestamptz']['output']>;
  video_id?: Maybe<Scalars['uuid']['output']>;
};

/** order by max() on columns of table "jobs" */
export type Jobs_Max_Order_By = {
  attempts?: InputMaybe<Order_By>;
  claimed_at?: InputMaybe<Order_By>;
  claimed_by?: InputMaybe<Order_By>;
  clip_id?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  error?: InputMaybe<Order_By>;
  heartbeat_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  parent_job_id?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
  progress_note?: InputMaybe<Order_By>;
  run_after?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  type?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Jobs_Min_Fields = {
  __typename?: 'jobs_min_fields';
  attempts?: Maybe<Scalars['Int']['output']>;
  claimed_at?: Maybe<Scalars['timestamptz']['output']>;
  claimed_by?: Maybe<Scalars['uuid']['output']>;
  clip_id?: Maybe<Scalars['uuid']['output']>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  heartbeat_at?: Maybe<Scalars['timestamptz']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  max_attempts?: Maybe<Scalars['Int']['output']>;
  parent_job_id?: Maybe<Scalars['uuid']['output']>;
  priority?: Maybe<Scalars['Int']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
  progress_note?: Maybe<Scalars['String']['output']>;
  run_after?: Maybe<Scalars['timestamptz']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['timestamptz']['output']>;
  video_id?: Maybe<Scalars['uuid']['output']>;
};

/** order by min() on columns of table "jobs" */
export type Jobs_Min_Order_By = {
  attempts?: InputMaybe<Order_By>;
  claimed_at?: InputMaybe<Order_By>;
  claimed_by?: InputMaybe<Order_By>;
  clip_id?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  error?: InputMaybe<Order_By>;
  heartbeat_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  parent_job_id?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
  progress_note?: InputMaybe<Order_By>;
  run_after?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  type?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "jobs" */
export type Jobs_Mutation_Response = {
  __typename?: 'jobs_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Jobs>;
};

/** input type for inserting object relation for remote table "jobs" */
export type Jobs_Obj_Rel_Insert_Input = {
  data: Jobs_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Jobs_On_Conflict>;
};

/** on_conflict condition type for table "jobs" */
export type Jobs_On_Conflict = {
  constraint: Jobs_Constraint;
  update_columns?: Array<Jobs_Update_Column>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};

/** Ordering options when selecting data from "jobs". */
export type Jobs_Order_By = {
  assets_aggregate?: InputMaybe<Assets_Aggregate_Order_By>;
  attempts?: InputMaybe<Order_By>;
  child_jobs_aggregate?: InputMaybe<Jobs_Aggregate_Order_By>;
  claimed_at?: InputMaybe<Order_By>;
  claimed_by?: InputMaybe<Order_By>;
  clip?: InputMaybe<Clips_Order_By>;
  clip_id?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  error?: InputMaybe<Order_By>;
  heartbeat_at?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  machine?: InputMaybe<Machines_Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  parent_job?: InputMaybe<Jobs_Order_By>;
  parent_job_id?: InputMaybe<Order_By>;
  payload?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
  progress_note?: InputMaybe<Order_By>;
  result?: InputMaybe<Order_By>;
  run_after?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  type?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  video?: InputMaybe<Videos_Order_By>;
  video_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: jobs */
export type Jobs_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Jobs_Prepend_Input = {
  payload?: InputMaybe<Scalars['jsonb']['input']>;
  result?: InputMaybe<Scalars['jsonb']['input']>;
};

/** select columns of table "jobs" */
export enum Jobs_Select_Column {
  /** column name */
  Attempts = 'attempts',
  /** column name */
  ClaimedAt = 'claimed_at',
  /** column name */
  ClaimedBy = 'claimed_by',
  /** column name */
  ClipId = 'clip_id',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Error = 'error',
  /** column name */
  HeartbeatAt = 'heartbeat_at',
  /** column name */
  Id = 'id',
  /** column name */
  MaxAttempts = 'max_attempts',
  /** column name */
  ParentJobId = 'parent_job_id',
  /** column name */
  Payload = 'payload',
  /** column name */
  Priority = 'priority',
  /** column name */
  Progress = 'progress',
  /** column name */
  ProgressNote = 'progress_note',
  /** column name */
  Result = 'result',
  /** column name */
  RunAfter = 'run_after',
  /** column name */
  Status = 'status',
  /** column name */
  Type = 'type',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  VideoId = 'video_id'
}

/** input type for updating data in table "jobs" */
export type Jobs_Set_Input = {
  attempts?: InputMaybe<Scalars['Int']['input']>;
  claimed_at?: InputMaybe<Scalars['timestamptz']['input']>;
  claimed_by?: InputMaybe<Scalars['uuid']['input']>;
  clip_id?: InputMaybe<Scalars['uuid']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  error?: InputMaybe<Scalars['String']['input']>;
  heartbeat_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  max_attempts?: InputMaybe<Scalars['Int']['input']>;
  parent_job_id?: InputMaybe<Scalars['uuid']['input']>;
  payload?: InputMaybe<Scalars['jsonb']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  progress?: InputMaybe<Scalars['Float']['input']>;
  progress_note?: InputMaybe<Scalars['String']['input']>;
  result?: InputMaybe<Scalars['jsonb']['input']>;
  run_after?: InputMaybe<Scalars['timestamptz']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate stddev on columns */
export type Jobs_Stddev_Fields = {
  __typename?: 'jobs_stddev_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev() on columns of table "jobs" */
export type Jobs_Stddev_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Jobs_Stddev_Pop_Fields = {
  __typename?: 'jobs_stddev_pop_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev_pop() on columns of table "jobs" */
export type Jobs_Stddev_Pop_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Jobs_Stddev_Samp_Fields = {
  __typename?: 'jobs_stddev_samp_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev_samp() on columns of table "jobs" */
export type Jobs_Stddev_Samp_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "jobs" */
export type Jobs_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Jobs_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Jobs_Stream_Cursor_Value_Input = {
  attempts?: InputMaybe<Scalars['Int']['input']>;
  claimed_at?: InputMaybe<Scalars['timestamptz']['input']>;
  claimed_by?: InputMaybe<Scalars['uuid']['input']>;
  clip_id?: InputMaybe<Scalars['uuid']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  error?: InputMaybe<Scalars['String']['input']>;
  heartbeat_at?: InputMaybe<Scalars['timestamptz']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  max_attempts?: InputMaybe<Scalars['Int']['input']>;
  parent_job_id?: InputMaybe<Scalars['uuid']['input']>;
  payload?: InputMaybe<Scalars['jsonb']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  progress?: InputMaybe<Scalars['Float']['input']>;
  progress_note?: InputMaybe<Scalars['String']['input']>;
  result?: InputMaybe<Scalars['jsonb']['input']>;
  run_after?: InputMaybe<Scalars['timestamptz']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate sum on columns */
export type Jobs_Sum_Fields = {
  __typename?: 'jobs_sum_fields';
  attempts?: Maybe<Scalars['Int']['output']>;
  max_attempts?: Maybe<Scalars['Int']['output']>;
  priority?: Maybe<Scalars['Int']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by sum() on columns of table "jobs" */
export type Jobs_Sum_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** update columns of table "jobs" */
export enum Jobs_Update_Column {
  /** column name */
  Attempts = 'attempts',
  /** column name */
  ClaimedAt = 'claimed_at',
  /** column name */
  ClaimedBy = 'claimed_by',
  /** column name */
  ClipId = 'clip_id',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Error = 'error',
  /** column name */
  HeartbeatAt = 'heartbeat_at',
  /** column name */
  Id = 'id',
  /** column name */
  MaxAttempts = 'max_attempts',
  /** column name */
  ParentJobId = 'parent_job_id',
  /** column name */
  Payload = 'payload',
  /** column name */
  Priority = 'priority',
  /** column name */
  Progress = 'progress',
  /** column name */
  ProgressNote = 'progress_note',
  /** column name */
  Result = 'result',
  /** column name */
  RunAfter = 'run_after',
  /** column name */
  Status = 'status',
  /** column name */
  Type = 'type',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  VideoId = 'video_id'
}

export type Jobs_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Jobs_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Jobs_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Jobs_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Jobs_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Jobs_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Jobs_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Jobs_Set_Input>;
  /** filter the rows which have to be updated */
  where: Jobs_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Jobs_Var_Pop_Fields = {
  __typename?: 'jobs_var_pop_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by var_pop() on columns of table "jobs" */
export type Jobs_Var_Pop_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Jobs_Var_Samp_Fields = {
  __typename?: 'jobs_var_samp_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by var_samp() on columns of table "jobs" */
export type Jobs_Var_Samp_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Jobs_Variance_Fields = {
  __typename?: 'jobs_variance_fields';
  attempts?: Maybe<Scalars['Float']['output']>;
  max_attempts?: Maybe<Scalars['Float']['output']>;
  priority?: Maybe<Scalars['Float']['output']>;
  progress?: Maybe<Scalars['Float']['output']>;
};

/** order by variance() on columns of table "jobs" */
export type Jobs_Variance_Order_By = {
  attempts?: InputMaybe<Order_By>;
  max_attempts?: InputMaybe<Order_By>;
  priority?: InputMaybe<Order_By>;
  progress?: InputMaybe<Order_By>;
};

export type Jsonb_Cast_Exp = {
  String?: InputMaybe<String_Comparison_Exp>;
};

/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
export type Jsonb_Comparison_Exp = {
  _cast?: InputMaybe<Jsonb_Cast_Exp>;
  /** is the column contained in the given json value */
  _contained_in?: InputMaybe<Scalars['jsonb']['input']>;
  /** does the column contain the given json value at the top level */
  _contains?: InputMaybe<Scalars['jsonb']['input']>;
  _eq?: InputMaybe<Scalars['jsonb']['input']>;
  _gt?: InputMaybe<Scalars['jsonb']['input']>;
  _gte?: InputMaybe<Scalars['jsonb']['input']>;
  /** does the string exist as a top-level key in the column */
  _has_key?: InputMaybe<Scalars['String']['input']>;
  /** do all of these strings exist as top-level keys in the column */
  _has_keys_all?: InputMaybe<Array<Scalars['String']['input']>>;
  /** do any of these strings exist as top-level keys in the column */
  _has_keys_any?: InputMaybe<Array<Scalars['String']['input']>>;
  _in?: InputMaybe<Array<Scalars['jsonb']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['jsonb']['input']>;
  _lte?: InputMaybe<Scalars['jsonb']['input']>;
  _neq?: InputMaybe<Scalars['jsonb']['input']>;
  _nin?: InputMaybe<Array<Scalars['jsonb']['input']>>;
};

/** Boolean expression to compare columns of type "macaddr". All fields are combined with logical 'AND'. */
export type Macaddr_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['macaddr']['input']>;
  _gt?: InputMaybe<Scalars['macaddr']['input']>;
  _gte?: InputMaybe<Scalars['macaddr']['input']>;
  _in?: InputMaybe<Array<Scalars['macaddr']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['macaddr']['input']>;
  _lte?: InputMaybe<Scalars['macaddr']['input']>;
  _neq?: InputMaybe<Scalars['macaddr']['input']>;
  _nin?: InputMaybe<Array<Scalars['macaddr']['input']>>;
};

/** columns and relationships of "machines" */
export type Machines = {
  __typename?: 'machines';
  capabilities: Array<Scalars['String']['output']>;
  created_at: Scalars['timestamptz']['output'];
  fallback: Array<Scalars['String']['output']>;
  id: Scalars['uuid']['output'];
  /** An array relationship */
  jobs: Array<Jobs>;
  /** An aggregate relationship */
  jobs_aggregate: Jobs_Aggregate;
  last_seen_at?: Maybe<Scalars['timestamptz']['output']>;
  mac_address?: Maybe<Scalars['macaddr']['output']>;
  name: Scalars['String']['output'];
  os?: Maybe<Scalars['String']['output']>;
  paused: Scalars['Boolean']['output'];
  status: Scalars['String']['output'];
  supported: Array<Scalars['String']['output']>;
  tailscale_ip?: Maybe<Scalars['inet']['output']>;
  woken_at?: Maybe<Scalars['timestamptz']['output']>;
  wol_via?: Maybe<Scalars['uuid']['output']>;
};


/** columns and relationships of "machines" */
export type MachinesJobsArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


/** columns and relationships of "machines" */
export type MachinesJobs_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};

/** aggregated selection of "machines" */
export type Machines_Aggregate = {
  __typename?: 'machines_aggregate';
  aggregate?: Maybe<Machines_Aggregate_Fields>;
  nodes: Array<Machines>;
};

/** aggregate fields of "machines" */
export type Machines_Aggregate_Fields = {
  __typename?: 'machines_aggregate_fields';
  count: Scalars['Int']['output'];
  max?: Maybe<Machines_Max_Fields>;
  min?: Maybe<Machines_Min_Fields>;
};


/** aggregate fields of "machines" */
export type Machines_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Machines_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "machines". All fields are combined with a logical 'AND'. */
export type Machines_Bool_Exp = {
  _and?: InputMaybe<Array<Machines_Bool_Exp>>;
  _not?: InputMaybe<Machines_Bool_Exp>;
  _or?: InputMaybe<Array<Machines_Bool_Exp>>;
  capabilities?: InputMaybe<String_Array_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  fallback?: InputMaybe<String_Array_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  jobs?: InputMaybe<Jobs_Bool_Exp>;
  jobs_aggregate?: InputMaybe<Jobs_Aggregate_Bool_Exp>;
  last_seen_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  mac_address?: InputMaybe<Macaddr_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  os?: InputMaybe<String_Comparison_Exp>;
  paused?: InputMaybe<Boolean_Comparison_Exp>;
  status?: InputMaybe<String_Comparison_Exp>;
  supported?: InputMaybe<String_Array_Comparison_Exp>;
  tailscale_ip?: InputMaybe<Inet_Comparison_Exp>;
  woken_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  wol_via?: InputMaybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "machines" */
export enum Machines_Constraint {
  /** unique or primary key constraint on columns "name" */
  MachinesNameKey = 'machines_name_key',
  /** unique or primary key constraint on columns "id" */
  MachinesPkey = 'machines_pkey'
}

/** input type for inserting data into table "machines" */
export type Machines_Insert_Input = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  fallback?: InputMaybe<Array<Scalars['String']['input']>>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  jobs?: InputMaybe<Jobs_Arr_Rel_Insert_Input>;
  last_seen_at?: InputMaybe<Scalars['timestamptz']['input']>;
  mac_address?: InputMaybe<Scalars['macaddr']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  os?: InputMaybe<Scalars['String']['input']>;
  paused?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  supported?: InputMaybe<Array<Scalars['String']['input']>>;
  tailscale_ip?: InputMaybe<Scalars['inet']['input']>;
  woken_at?: InputMaybe<Scalars['timestamptz']['input']>;
  wol_via?: InputMaybe<Scalars['uuid']['input']>;
};

/** aggregate max on columns */
export type Machines_Max_Fields = {
  __typename?: 'machines_max_fields';
  capabilities?: Maybe<Array<Scalars['String']['output']>>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  fallback?: Maybe<Array<Scalars['String']['output']>>;
  id?: Maybe<Scalars['uuid']['output']>;
  last_seen_at?: Maybe<Scalars['timestamptz']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  os?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  supported?: Maybe<Array<Scalars['String']['output']>>;
  woken_at?: Maybe<Scalars['timestamptz']['output']>;
  wol_via?: Maybe<Scalars['uuid']['output']>;
};

/** aggregate min on columns */
export type Machines_Min_Fields = {
  __typename?: 'machines_min_fields';
  capabilities?: Maybe<Array<Scalars['String']['output']>>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  fallback?: Maybe<Array<Scalars['String']['output']>>;
  id?: Maybe<Scalars['uuid']['output']>;
  last_seen_at?: Maybe<Scalars['timestamptz']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  os?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  supported?: Maybe<Array<Scalars['String']['output']>>;
  woken_at?: Maybe<Scalars['timestamptz']['output']>;
  wol_via?: Maybe<Scalars['uuid']['output']>;
};

/** response of any mutation on the table "machines" */
export type Machines_Mutation_Response = {
  __typename?: 'machines_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Machines>;
};

/** input type for inserting object relation for remote table "machines" */
export type Machines_Obj_Rel_Insert_Input = {
  data: Machines_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Machines_On_Conflict>;
};

/** on_conflict condition type for table "machines" */
export type Machines_On_Conflict = {
  constraint: Machines_Constraint;
  update_columns?: Array<Machines_Update_Column>;
  where?: InputMaybe<Machines_Bool_Exp>;
};

/** Ordering options when selecting data from "machines". */
export type Machines_Order_By = {
  capabilities?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  fallback?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  jobs_aggregate?: InputMaybe<Jobs_Aggregate_Order_By>;
  last_seen_at?: InputMaybe<Order_By>;
  mac_address?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  os?: InputMaybe<Order_By>;
  paused?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  supported?: InputMaybe<Order_By>;
  tailscale_ip?: InputMaybe<Order_By>;
  woken_at?: InputMaybe<Order_By>;
  wol_via?: InputMaybe<Order_By>;
};

/** primary key columns input for table: machines */
export type Machines_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "machines" */
export enum Machines_Select_Column {
  /** column name */
  Capabilities = 'capabilities',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Fallback = 'fallback',
  /** column name */
  Id = 'id',
  /** column name */
  LastSeenAt = 'last_seen_at',
  /** column name */
  MacAddress = 'mac_address',
  /** column name */
  Name = 'name',
  /** column name */
  Os = 'os',
  /** column name */
  Paused = 'paused',
  /** column name */
  Status = 'status',
  /** column name */
  Supported = 'supported',
  /** column name */
  TailscaleIp = 'tailscale_ip',
  /** column name */
  WokenAt = 'woken_at',
  /** column name */
  WolVia = 'wol_via'
}

/** input type for updating data in table "machines" */
export type Machines_Set_Input = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  fallback?: InputMaybe<Array<Scalars['String']['input']>>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  last_seen_at?: InputMaybe<Scalars['timestamptz']['input']>;
  mac_address?: InputMaybe<Scalars['macaddr']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  os?: InputMaybe<Scalars['String']['input']>;
  paused?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  supported?: InputMaybe<Array<Scalars['String']['input']>>;
  tailscale_ip?: InputMaybe<Scalars['inet']['input']>;
  woken_at?: InputMaybe<Scalars['timestamptz']['input']>;
  wol_via?: InputMaybe<Scalars['uuid']['input']>;
};

/** Streaming cursor of the table "machines" */
export type Machines_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Machines_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Machines_Stream_Cursor_Value_Input = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  fallback?: InputMaybe<Array<Scalars['String']['input']>>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  last_seen_at?: InputMaybe<Scalars['timestamptz']['input']>;
  mac_address?: InputMaybe<Scalars['macaddr']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  os?: InputMaybe<Scalars['String']['input']>;
  paused?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  supported?: InputMaybe<Array<Scalars['String']['input']>>;
  tailscale_ip?: InputMaybe<Scalars['inet']['input']>;
  woken_at?: InputMaybe<Scalars['timestamptz']['input']>;
  wol_via?: InputMaybe<Scalars['uuid']['input']>;
};

/** update columns of table "machines" */
export enum Machines_Update_Column {
  /** column name */
  Capabilities = 'capabilities',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Fallback = 'fallback',
  /** column name */
  Id = 'id',
  /** column name */
  LastSeenAt = 'last_seen_at',
  /** column name */
  MacAddress = 'mac_address',
  /** column name */
  Name = 'name',
  /** column name */
  Os = 'os',
  /** column name */
  Paused = 'paused',
  /** column name */
  Status = 'status',
  /** column name */
  Supported = 'supported',
  /** column name */
  TailscaleIp = 'tailscale_ip',
  /** column name */
  WokenAt = 'woken_at',
  /** column name */
  WolVia = 'wol_via'
}

export type Machines_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Machines_Set_Input>;
  /** filter the rows which have to be updated */
  where: Machines_Bool_Exp;
};

/** mutation root */
export type Mutation_Root = {
  __typename?: 'mutation_root';
  /** Download a reference Short and break its edit down into a recipe + Resolve notes */
  analyze_style?: Maybe<AnalyzeStyleOutput>;
  /** delete data from the table: "assets" */
  delete_assets?: Maybe<Assets_Mutation_Response>;
  /** delete single row from the table: "assets" */
  delete_assets_by_pk?: Maybe<Assets>;
  /** delete data from the table: "clips" */
  delete_clips?: Maybe<Clips_Mutation_Response>;
  /** delete single row from the table: "clips" */
  delete_clips_by_pk?: Maybe<Clips>;
  /** delete data from the table: "jobs" */
  delete_jobs?: Maybe<Jobs_Mutation_Response>;
  /** delete single row from the table: "jobs" */
  delete_jobs_by_pk?: Maybe<Jobs>;
  /** delete data from the table: "machines" */
  delete_machines?: Maybe<Machines_Mutation_Response>;
  /** delete single row from the table: "machines" */
  delete_machines_by_pk?: Maybe<Machines>;
  /** delete data from the table: "recipes" */
  delete_recipes?: Maybe<Recipes_Mutation_Response>;
  /** delete single row from the table: "recipes" */
  delete_recipes_by_pk?: Maybe<Recipes>;
  /** delete data from the table: "styles" */
  delete_styles?: Maybe<Styles_Mutation_Response>;
  /** delete single row from the table: "styles" */
  delete_styles_by_pk?: Maybe<Styles>;
  /** delete data from the table: "videos" */
  delete_videos?: Maybe<Videos_Mutation_Response>;
  /** delete single row from the table: "videos" */
  delete_videos_by_pk?: Maybe<Videos>;
  /** Validated job insert (payload checked against the worker schemas) */
  enqueue_job?: Maybe<EnqueueOutput>;
  /** insert data into the table: "assets" */
  insert_assets?: Maybe<Assets_Mutation_Response>;
  /** insert a single row into the table: "assets" */
  insert_assets_one?: Maybe<Assets>;
  /** insert data into the table: "clips" */
  insert_clips?: Maybe<Clips_Mutation_Response>;
  /** insert a single row into the table: "clips" */
  insert_clips_one?: Maybe<Clips>;
  /** insert data into the table: "jobs" */
  insert_jobs?: Maybe<Jobs_Mutation_Response>;
  /** insert a single row into the table: "jobs" */
  insert_jobs_one?: Maybe<Jobs>;
  /** insert data into the table: "machines" */
  insert_machines?: Maybe<Machines_Mutation_Response>;
  /** insert a single row into the table: "machines" */
  insert_machines_one?: Maybe<Machines>;
  /** insert data into the table: "recipes" */
  insert_recipes?: Maybe<Recipes_Mutation_Response>;
  /** insert a single row into the table: "recipes" */
  insert_recipes_one?: Maybe<Recipes>;
  /** insert data into the table: "styles" */
  insert_styles?: Maybe<Styles_Mutation_Response>;
  /** insert a single row into the table: "styles" */
  insert_styles_one?: Maybe<Styles>;
  /** insert data into the table: "videos" */
  insert_videos?: Maybe<Videos_Mutation_Response>;
  /** insert a single row into the table: "videos" */
  insert_videos_one?: Maybe<Videos>;
  /** yt-dlp metadata for a URL (nothing downloaded) */
  probe_url?: Maybe<ProbeResult>;
  /** Create the video row + download job (ideas inbox entry point) */
  start_download?: Maybe<StartDownloadOutput>;
  /** update data of the table: "assets" */
  update_assets?: Maybe<Assets_Mutation_Response>;
  /** update single row of the table: "assets" */
  update_assets_by_pk?: Maybe<Assets>;
  /** update multiples rows of table: "assets" */
  update_assets_many?: Maybe<Array<Maybe<Assets_Mutation_Response>>>;
  /** update data of the table: "clips" */
  update_clips?: Maybe<Clips_Mutation_Response>;
  /** update single row of the table: "clips" */
  update_clips_by_pk?: Maybe<Clips>;
  /** update multiples rows of table: "clips" */
  update_clips_many?: Maybe<Array<Maybe<Clips_Mutation_Response>>>;
  /** update data of the table: "jobs" */
  update_jobs?: Maybe<Jobs_Mutation_Response>;
  /** update single row of the table: "jobs" */
  update_jobs_by_pk?: Maybe<Jobs>;
  /** update multiples rows of table: "jobs" */
  update_jobs_many?: Maybe<Array<Maybe<Jobs_Mutation_Response>>>;
  /** update data of the table: "machines" */
  update_machines?: Maybe<Machines_Mutation_Response>;
  /** update single row of the table: "machines" */
  update_machines_by_pk?: Maybe<Machines>;
  /** update multiples rows of table: "machines" */
  update_machines_many?: Maybe<Array<Maybe<Machines_Mutation_Response>>>;
  /** update data of the table: "recipes" */
  update_recipes?: Maybe<Recipes_Mutation_Response>;
  /** update single row of the table: "recipes" */
  update_recipes_by_pk?: Maybe<Recipes>;
  /** update multiples rows of table: "recipes" */
  update_recipes_many?: Maybe<Array<Maybe<Recipes_Mutation_Response>>>;
  /** update data of the table: "styles" */
  update_styles?: Maybe<Styles_Mutation_Response>;
  /** update single row of the table: "styles" */
  update_styles_by_pk?: Maybe<Styles>;
  /** update multiples rows of table: "styles" */
  update_styles_many?: Maybe<Array<Maybe<Styles_Mutation_Response>>>;
  /** update data of the table: "videos" */
  update_videos?: Maybe<Videos_Mutation_Response>;
  /** update single row of the table: "videos" */
  update_videos_by_pk?: Maybe<Videos>;
  /** update multiples rows of table: "videos" */
  update_videos_many?: Maybe<Array<Maybe<Videos_Mutation_Response>>>;
  /** Send a Wake-on-LAN magic packet */
  wake_machine?: Maybe<WakeOutput>;
};


/** mutation root */
export type Mutation_RootAnalyze_StyleArgs = {
  url: Scalars['String']['input'];
};


/** mutation root */
export type Mutation_RootDelete_AssetsArgs = {
  where: Assets_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Assets_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_ClipsArgs = {
  where: Clips_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Clips_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_JobsArgs = {
  where: Jobs_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Jobs_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_MachinesArgs = {
  where: Machines_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Machines_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_RecipesArgs = {
  where: Recipes_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Recipes_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_StylesArgs = {
  where: Styles_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Styles_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_VideosArgs = {
  where: Videos_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Videos_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootEnqueue_JobArgs = {
  clip_id?: InputMaybe<Scalars['uuid']['input']>;
  payload?: InputMaybe<Scalars['jsonb']['input']>;
  type: Scalars['String']['input'];
  video_id?: InputMaybe<Scalars['uuid']['input']>;
};


/** mutation root */
export type Mutation_RootInsert_AssetsArgs = {
  objects: Array<Assets_Insert_Input>;
  on_conflict?: InputMaybe<Assets_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Assets_OneArgs = {
  object: Assets_Insert_Input;
  on_conflict?: InputMaybe<Assets_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_ClipsArgs = {
  objects: Array<Clips_Insert_Input>;
  on_conflict?: InputMaybe<Clips_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Clips_OneArgs = {
  object: Clips_Insert_Input;
  on_conflict?: InputMaybe<Clips_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_JobsArgs = {
  objects: Array<Jobs_Insert_Input>;
  on_conflict?: InputMaybe<Jobs_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Jobs_OneArgs = {
  object: Jobs_Insert_Input;
  on_conflict?: InputMaybe<Jobs_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_MachinesArgs = {
  objects: Array<Machines_Insert_Input>;
  on_conflict?: InputMaybe<Machines_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Machines_OneArgs = {
  object: Machines_Insert_Input;
  on_conflict?: InputMaybe<Machines_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_RecipesArgs = {
  objects: Array<Recipes_Insert_Input>;
  on_conflict?: InputMaybe<Recipes_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Recipes_OneArgs = {
  object: Recipes_Insert_Input;
  on_conflict?: InputMaybe<Recipes_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_StylesArgs = {
  objects: Array<Styles_Insert_Input>;
  on_conflict?: InputMaybe<Styles_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Styles_OneArgs = {
  object: Styles_Insert_Input;
  on_conflict?: InputMaybe<Styles_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_VideosArgs = {
  objects: Array<Videos_Insert_Input>;
  on_conflict?: InputMaybe<Videos_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Videos_OneArgs = {
  object: Videos_Insert_Input;
  on_conflict?: InputMaybe<Videos_On_Conflict>;
};


/** mutation root */
export type Mutation_RootProbe_UrlArgs = {
  url: Scalars['String']['input'];
};


/** mutation root */
export type Mutation_RootStart_DownloadArgs = {
  note?: InputMaybe<Scalars['String']['input']>;
  pipeline?: InputMaybe<Scalars['String']['input']>;
  quality: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
  url: Scalars['String']['input'];
  youtube_id?: InputMaybe<Scalars['String']['input']>;
};


/** mutation root */
export type Mutation_RootUpdate_AssetsArgs = {
  _append?: InputMaybe<Assets_Append_Input>;
  _delete_at_path?: InputMaybe<Assets_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Assets_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Assets_Delete_Key_Input>;
  _prepend?: InputMaybe<Assets_Prepend_Input>;
  _set?: InputMaybe<Assets_Set_Input>;
  where: Assets_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Assets_By_PkArgs = {
  _append?: InputMaybe<Assets_Append_Input>;
  _delete_at_path?: InputMaybe<Assets_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Assets_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Assets_Delete_Key_Input>;
  _prepend?: InputMaybe<Assets_Prepend_Input>;
  _set?: InputMaybe<Assets_Set_Input>;
  pk_columns: Assets_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Assets_ManyArgs = {
  updates: Array<Assets_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_ClipsArgs = {
  _append?: InputMaybe<Clips_Append_Input>;
  _delete_at_path?: InputMaybe<Clips_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Clips_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Clips_Delete_Key_Input>;
  _inc?: InputMaybe<Clips_Inc_Input>;
  _prepend?: InputMaybe<Clips_Prepend_Input>;
  _set?: InputMaybe<Clips_Set_Input>;
  where: Clips_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Clips_By_PkArgs = {
  _append?: InputMaybe<Clips_Append_Input>;
  _delete_at_path?: InputMaybe<Clips_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Clips_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Clips_Delete_Key_Input>;
  _inc?: InputMaybe<Clips_Inc_Input>;
  _prepend?: InputMaybe<Clips_Prepend_Input>;
  _set?: InputMaybe<Clips_Set_Input>;
  pk_columns: Clips_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Clips_ManyArgs = {
  updates: Array<Clips_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_JobsArgs = {
  _append?: InputMaybe<Jobs_Append_Input>;
  _delete_at_path?: InputMaybe<Jobs_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Jobs_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Jobs_Delete_Key_Input>;
  _inc?: InputMaybe<Jobs_Inc_Input>;
  _prepend?: InputMaybe<Jobs_Prepend_Input>;
  _set?: InputMaybe<Jobs_Set_Input>;
  where: Jobs_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Jobs_By_PkArgs = {
  _append?: InputMaybe<Jobs_Append_Input>;
  _delete_at_path?: InputMaybe<Jobs_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Jobs_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Jobs_Delete_Key_Input>;
  _inc?: InputMaybe<Jobs_Inc_Input>;
  _prepend?: InputMaybe<Jobs_Prepend_Input>;
  _set?: InputMaybe<Jobs_Set_Input>;
  pk_columns: Jobs_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Jobs_ManyArgs = {
  updates: Array<Jobs_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_MachinesArgs = {
  _set?: InputMaybe<Machines_Set_Input>;
  where: Machines_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Machines_By_PkArgs = {
  _set?: InputMaybe<Machines_Set_Input>;
  pk_columns: Machines_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Machines_ManyArgs = {
  updates: Array<Machines_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_RecipesArgs = {
  _append?: InputMaybe<Recipes_Append_Input>;
  _delete_at_path?: InputMaybe<Recipes_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Recipes_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Recipes_Delete_Key_Input>;
  _prepend?: InputMaybe<Recipes_Prepend_Input>;
  _set?: InputMaybe<Recipes_Set_Input>;
  where: Recipes_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Recipes_By_PkArgs = {
  _append?: InputMaybe<Recipes_Append_Input>;
  _delete_at_path?: InputMaybe<Recipes_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Recipes_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Recipes_Delete_Key_Input>;
  _prepend?: InputMaybe<Recipes_Prepend_Input>;
  _set?: InputMaybe<Recipes_Set_Input>;
  pk_columns: Recipes_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Recipes_ManyArgs = {
  updates: Array<Recipes_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_StylesArgs = {
  _append?: InputMaybe<Styles_Append_Input>;
  _delete_at_path?: InputMaybe<Styles_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Styles_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Styles_Delete_Key_Input>;
  _inc?: InputMaybe<Styles_Inc_Input>;
  _prepend?: InputMaybe<Styles_Prepend_Input>;
  _set?: InputMaybe<Styles_Set_Input>;
  where: Styles_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Styles_By_PkArgs = {
  _append?: InputMaybe<Styles_Append_Input>;
  _delete_at_path?: InputMaybe<Styles_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Styles_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Styles_Delete_Key_Input>;
  _inc?: InputMaybe<Styles_Inc_Input>;
  _prepend?: InputMaybe<Styles_Prepend_Input>;
  _set?: InputMaybe<Styles_Set_Input>;
  pk_columns: Styles_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Styles_ManyArgs = {
  updates: Array<Styles_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_VideosArgs = {
  _append?: InputMaybe<Videos_Append_Input>;
  _delete_at_path?: InputMaybe<Videos_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Videos_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Videos_Delete_Key_Input>;
  _inc?: InputMaybe<Videos_Inc_Input>;
  _prepend?: InputMaybe<Videos_Prepend_Input>;
  _set?: InputMaybe<Videos_Set_Input>;
  where: Videos_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Videos_By_PkArgs = {
  _append?: InputMaybe<Videos_Append_Input>;
  _delete_at_path?: InputMaybe<Videos_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Videos_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Videos_Delete_Key_Input>;
  _inc?: InputMaybe<Videos_Inc_Input>;
  _prepend?: InputMaybe<Videos_Prepend_Input>;
  _set?: InputMaybe<Videos_Set_Input>;
  pk_columns: Videos_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Videos_ManyArgs = {
  updates: Array<Videos_Updates>;
};


/** mutation root */
export type Mutation_RootWake_MachineArgs = {
  name: Scalars['String']['input'];
};

/** column ordering options */
export enum Order_By {
  /** in ascending order, nulls last */
  Asc = 'asc',
  /** in ascending order, nulls first */
  AscNullsFirst = 'asc_nulls_first',
  /** in ascending order, nulls last */
  AscNullsLast = 'asc_nulls_last',
  /** in descending order, nulls first */
  Desc = 'desc',
  /** in descending order, nulls first */
  DescNullsFirst = 'desc_nulls_first',
  /** in descending order, nulls last */
  DescNullsLast = 'desc_nulls_last'
}

export type Query_Root = {
  __typename?: 'query_root';
  /** An array relationship */
  assets: Array<Assets>;
  /** An aggregate relationship */
  assets_aggregate: Assets_Aggregate;
  /** fetch data from the table: "assets" using primary key columns */
  assets_by_pk?: Maybe<Assets>;
  /** An array relationship */
  clips: Array<Clips>;
  /** An aggregate relationship */
  clips_aggregate: Clips_Aggregate;
  /** fetch data from the table: "clips" using primary key columns */
  clips_by_pk?: Maybe<Clips>;
  /** An array relationship */
  jobs: Array<Jobs>;
  /** An aggregate relationship */
  jobs_aggregate: Jobs_Aggregate;
  /** fetch data from the table: "jobs" using primary key columns */
  jobs_by_pk?: Maybe<Jobs>;
  /** fetch data from the table: "machines" */
  machines: Array<Machines>;
  /** fetch aggregated fields from the table: "machines" */
  machines_aggregate: Machines_Aggregate;
  /** fetch data from the table: "machines" using primary key columns */
  machines_by_pk?: Maybe<Machines>;
  /** fetch data from the table: "recipes" */
  recipes: Array<Recipes>;
  /** fetch aggregated fields from the table: "recipes" */
  recipes_aggregate: Recipes_Aggregate;
  /** fetch data from the table: "recipes" using primary key columns */
  recipes_by_pk?: Maybe<Recipes>;
  /** fetch data from the table: "styles" */
  styles: Array<Styles>;
  /** fetch aggregated fields from the table: "styles" */
  styles_aggregate: Styles_Aggregate;
  /** fetch data from the table: "styles" using primary key columns */
  styles_by_pk?: Maybe<Styles>;
  /** fetch data from the table: "videos" */
  videos: Array<Videos>;
  /** fetch aggregated fields from the table: "videos" */
  videos_aggregate: Videos_Aggregate;
  /** fetch data from the table: "videos" using primary key columns */
  videos_by_pk?: Maybe<Videos>;
};


export type Query_RootAssetsArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


export type Query_RootAssets_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


export type Query_RootAssets_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootClipsArgs = {
  distinct_on?: InputMaybe<Array<Clips_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Clips_Order_By>>;
  where?: InputMaybe<Clips_Bool_Exp>;
};


export type Query_RootClips_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Clips_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Clips_Order_By>>;
  where?: InputMaybe<Clips_Bool_Exp>;
};


export type Query_RootClips_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootJobsArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


export type Query_RootJobs_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


export type Query_RootJobs_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootMachinesArgs = {
  distinct_on?: InputMaybe<Array<Machines_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Machines_Order_By>>;
  where?: InputMaybe<Machines_Bool_Exp>;
};


export type Query_RootMachines_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Machines_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Machines_Order_By>>;
  where?: InputMaybe<Machines_Bool_Exp>;
};


export type Query_RootMachines_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootRecipesArgs = {
  distinct_on?: InputMaybe<Array<Recipes_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Recipes_Order_By>>;
  where?: InputMaybe<Recipes_Bool_Exp>;
};


export type Query_RootRecipes_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Recipes_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Recipes_Order_By>>;
  where?: InputMaybe<Recipes_Bool_Exp>;
};


export type Query_RootRecipes_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootStylesArgs = {
  distinct_on?: InputMaybe<Array<Styles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Styles_Order_By>>;
  where?: InputMaybe<Styles_Bool_Exp>;
};


export type Query_RootStyles_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Styles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Styles_Order_By>>;
  where?: InputMaybe<Styles_Bool_Exp>;
};


export type Query_RootStyles_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootVideosArgs = {
  distinct_on?: InputMaybe<Array<Videos_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Videos_Order_By>>;
  where?: InputMaybe<Videos_Bool_Exp>;
};


export type Query_RootVideos_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Videos_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Videos_Order_By>>;
  where?: InputMaybe<Videos_Bool_Exp>;
};


export type Query_RootVideos_By_PkArgs = {
  id: Scalars['uuid']['input'];
};

/** columns and relationships of "recipes" */
export type Recipes = {
  __typename?: 'recipes';
  auto_apply: Scalars['Boolean']['output'];
  /** An array relationship */
  clips: Array<Clips>;
  /** An aggregate relationship */
  clips_aggregate: Clips_Aggregate;
  created_at: Scalars['timestamptz']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['uuid']['output'];
  name: Scalars['String']['output'];
  settings: Scalars['jsonb']['output'];
  updated_at: Scalars['timestamptz']['output'];
};


/** columns and relationships of "recipes" */
export type RecipesClipsArgs = {
  distinct_on?: InputMaybe<Array<Clips_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Clips_Order_By>>;
  where?: InputMaybe<Clips_Bool_Exp>;
};


/** columns and relationships of "recipes" */
export type RecipesClips_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Clips_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Clips_Order_By>>;
  where?: InputMaybe<Clips_Bool_Exp>;
};


/** columns and relationships of "recipes" */
export type RecipesSettingsArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "recipes" */
export type Recipes_Aggregate = {
  __typename?: 'recipes_aggregate';
  aggregate?: Maybe<Recipes_Aggregate_Fields>;
  nodes: Array<Recipes>;
};

/** aggregate fields of "recipes" */
export type Recipes_Aggregate_Fields = {
  __typename?: 'recipes_aggregate_fields';
  count: Scalars['Int']['output'];
  max?: Maybe<Recipes_Max_Fields>;
  min?: Maybe<Recipes_Min_Fields>;
};


/** aggregate fields of "recipes" */
export type Recipes_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Recipes_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Recipes_Append_Input = {
  settings?: InputMaybe<Scalars['jsonb']['input']>;
};

/** Boolean expression to filter rows from the table "recipes". All fields are combined with a logical 'AND'. */
export type Recipes_Bool_Exp = {
  _and?: InputMaybe<Array<Recipes_Bool_Exp>>;
  _not?: InputMaybe<Recipes_Bool_Exp>;
  _or?: InputMaybe<Array<Recipes_Bool_Exp>>;
  auto_apply?: InputMaybe<Boolean_Comparison_Exp>;
  clips?: InputMaybe<Clips_Bool_Exp>;
  clips_aggregate?: InputMaybe<Clips_Aggregate_Bool_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  description?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  settings?: InputMaybe<Jsonb_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "recipes" */
export enum Recipes_Constraint {
  /** unique or primary key constraint on columns "name" */
  RecipesNameKey = 'recipes_name_key',
  /** unique or primary key constraint on columns "id" */
  RecipesPkey = 'recipes_pkey'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Recipes_Delete_At_Path_Input = {
  settings?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Recipes_Delete_Elem_Input = {
  settings?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Recipes_Delete_Key_Input = {
  settings?: InputMaybe<Scalars['String']['input']>;
};

/** input type for inserting data into table "recipes" */
export type Recipes_Insert_Input = {
  auto_apply?: InputMaybe<Scalars['Boolean']['input']>;
  clips?: InputMaybe<Clips_Arr_Rel_Insert_Input>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  settings?: InputMaybe<Scalars['jsonb']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** aggregate max on columns */
export type Recipes_Max_Fields = {
  __typename?: 'recipes_max_fields';
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['timestamptz']['output']>;
};

/** aggregate min on columns */
export type Recipes_Min_Fields = {
  __typename?: 'recipes_min_fields';
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['timestamptz']['output']>;
};

/** response of any mutation on the table "recipes" */
export type Recipes_Mutation_Response = {
  __typename?: 'recipes_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Recipes>;
};

/** input type for inserting object relation for remote table "recipes" */
export type Recipes_Obj_Rel_Insert_Input = {
  data: Recipes_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Recipes_On_Conflict>;
};

/** on_conflict condition type for table "recipes" */
export type Recipes_On_Conflict = {
  constraint: Recipes_Constraint;
  update_columns?: Array<Recipes_Update_Column>;
  where?: InputMaybe<Recipes_Bool_Exp>;
};

/** Ordering options when selecting data from "recipes". */
export type Recipes_Order_By = {
  auto_apply?: InputMaybe<Order_By>;
  clips_aggregate?: InputMaybe<Clips_Aggregate_Order_By>;
  created_at?: InputMaybe<Order_By>;
  description?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  settings?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
};

/** primary key columns input for table: recipes */
export type Recipes_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Recipes_Prepend_Input = {
  settings?: InputMaybe<Scalars['jsonb']['input']>;
};

/** select columns of table "recipes" */
export enum Recipes_Select_Column {
  /** column name */
  AutoApply = 'auto_apply',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Description = 'description',
  /** column name */
  Id = 'id',
  /** column name */
  Name = 'name',
  /** column name */
  Settings = 'settings',
  /** column name */
  UpdatedAt = 'updated_at'
}

/** input type for updating data in table "recipes" */
export type Recipes_Set_Input = {
  auto_apply?: InputMaybe<Scalars['Boolean']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  settings?: InputMaybe<Scalars['jsonb']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** Streaming cursor of the table "recipes" */
export type Recipes_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Recipes_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Recipes_Stream_Cursor_Value_Input = {
  auto_apply?: InputMaybe<Scalars['Boolean']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  settings?: InputMaybe<Scalars['jsonb']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
};

/** update columns of table "recipes" */
export enum Recipes_Update_Column {
  /** column name */
  AutoApply = 'auto_apply',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Description = 'description',
  /** column name */
  Id = 'id',
  /** column name */
  Name = 'name',
  /** column name */
  Settings = 'settings',
  /** column name */
  UpdatedAt = 'updated_at'
}

export type Recipes_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Recipes_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Recipes_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Recipes_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Recipes_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Recipes_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Recipes_Set_Input>;
  /** filter the rows which have to be updated */
  where: Recipes_Bool_Exp;
};

/** columns and relationships of "styles" */
export type Styles = {
  __typename?: 'styles';
  channel?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['timestamptz']['output'];
  duration?: Maybe<Scalars['Float']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['uuid']['output'];
  /** An object relationship */
  job?: Maybe<Jobs>;
  job_id?: Maybe<Scalars['uuid']['output']>;
  measured?: Maybe<Scalars['jsonb']['output']>;
  recipe?: Maybe<Scalars['jsonb']['output']>;
  ref_path?: Maybe<Scalars['String']['output']>;
  report?: Maybe<Scalars['jsonb']['output']>;
  resolve_notes?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  thumb_path?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updated_at: Scalars['timestamptz']['output'];
  url: Scalars['String']['output'];
  width?: Maybe<Scalars['Int']['output']>;
  youtube_id?: Maybe<Scalars['String']['output']>;
};


/** columns and relationships of "styles" */
export type StylesMeasuredArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};


/** columns and relationships of "styles" */
export type StylesRecipeArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};


/** columns and relationships of "styles" */
export type StylesReportArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "styles" */
export type Styles_Aggregate = {
  __typename?: 'styles_aggregate';
  aggregate?: Maybe<Styles_Aggregate_Fields>;
  nodes: Array<Styles>;
};

/** aggregate fields of "styles" */
export type Styles_Aggregate_Fields = {
  __typename?: 'styles_aggregate_fields';
  avg?: Maybe<Styles_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Styles_Max_Fields>;
  min?: Maybe<Styles_Min_Fields>;
  stddev?: Maybe<Styles_Stddev_Fields>;
  stddev_pop?: Maybe<Styles_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Styles_Stddev_Samp_Fields>;
  sum?: Maybe<Styles_Sum_Fields>;
  var_pop?: Maybe<Styles_Var_Pop_Fields>;
  var_samp?: Maybe<Styles_Var_Samp_Fields>;
  variance?: Maybe<Styles_Variance_Fields>;
};


/** aggregate fields of "styles" */
export type Styles_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Styles_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Styles_Append_Input = {
  measured?: InputMaybe<Scalars['jsonb']['input']>;
  recipe?: InputMaybe<Scalars['jsonb']['input']>;
  report?: InputMaybe<Scalars['jsonb']['input']>;
};

/** aggregate avg on columns */
export type Styles_Avg_Fields = {
  __typename?: 'styles_avg_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "styles". All fields are combined with a logical 'AND'. */
export type Styles_Bool_Exp = {
  _and?: InputMaybe<Array<Styles_Bool_Exp>>;
  _not?: InputMaybe<Styles_Bool_Exp>;
  _or?: InputMaybe<Array<Styles_Bool_Exp>>;
  channel?: InputMaybe<String_Comparison_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  duration?: InputMaybe<Float_Comparison_Exp>;
  error?: InputMaybe<String_Comparison_Exp>;
  height?: InputMaybe<Int_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  job?: InputMaybe<Jobs_Bool_Exp>;
  job_id?: InputMaybe<Uuid_Comparison_Exp>;
  measured?: InputMaybe<Jsonb_Comparison_Exp>;
  recipe?: InputMaybe<Jsonb_Comparison_Exp>;
  ref_path?: InputMaybe<String_Comparison_Exp>;
  report?: InputMaybe<Jsonb_Comparison_Exp>;
  resolve_notes?: InputMaybe<String_Comparison_Exp>;
  status?: InputMaybe<String_Comparison_Exp>;
  thumb_path?: InputMaybe<String_Comparison_Exp>;
  title?: InputMaybe<String_Comparison_Exp>;
  updated_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  url?: InputMaybe<String_Comparison_Exp>;
  width?: InputMaybe<Int_Comparison_Exp>;
  youtube_id?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "styles" */
export enum Styles_Constraint {
  /** unique or primary key constraint on columns "id" */
  StylesPkey = 'styles_pkey',
  /** unique or primary key constraint on columns "youtube_id" */
  StylesYoutubeIdKey = 'styles_youtube_id_key'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Styles_Delete_At_Path_Input = {
  measured?: InputMaybe<Array<Scalars['String']['input']>>;
  recipe?: InputMaybe<Array<Scalars['String']['input']>>;
  report?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Styles_Delete_Elem_Input = {
  measured?: InputMaybe<Scalars['Int']['input']>;
  recipe?: InputMaybe<Scalars['Int']['input']>;
  report?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Styles_Delete_Key_Input = {
  measured?: InputMaybe<Scalars['String']['input']>;
  recipe?: InputMaybe<Scalars['String']['input']>;
  report?: InputMaybe<Scalars['String']['input']>;
};

/** input type for incrementing numeric columns in table "styles" */
export type Styles_Inc_Input = {
  duration?: InputMaybe<Scalars['Float']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** input type for inserting data into table "styles" */
export type Styles_Insert_Input = {
  channel?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  duration?: InputMaybe<Scalars['Float']['input']>;
  error?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  job?: InputMaybe<Jobs_Obj_Rel_Insert_Input>;
  job_id?: InputMaybe<Scalars['uuid']['input']>;
  measured?: InputMaybe<Scalars['jsonb']['input']>;
  recipe?: InputMaybe<Scalars['jsonb']['input']>;
  ref_path?: InputMaybe<Scalars['String']['input']>;
  report?: InputMaybe<Scalars['jsonb']['input']>;
  resolve_notes?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  thumb_path?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
  youtube_id?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate max on columns */
export type Styles_Max_Fields = {
  __typename?: 'styles_max_fields';
  channel?: Maybe<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  duration?: Maybe<Scalars['Float']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  job_id?: Maybe<Scalars['uuid']['output']>;
  ref_path?: Maybe<Scalars['String']['output']>;
  resolve_notes?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  thumb_path?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['timestamptz']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
  youtube_id?: Maybe<Scalars['String']['output']>;
};

/** aggregate min on columns */
export type Styles_Min_Fields = {
  __typename?: 'styles_min_fields';
  channel?: Maybe<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  duration?: Maybe<Scalars['Float']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  job_id?: Maybe<Scalars['uuid']['output']>;
  ref_path?: Maybe<Scalars['String']['output']>;
  resolve_notes?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  thumb_path?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['timestamptz']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
  youtube_id?: Maybe<Scalars['String']['output']>;
};

/** response of any mutation on the table "styles" */
export type Styles_Mutation_Response = {
  __typename?: 'styles_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Styles>;
};

/** on_conflict condition type for table "styles" */
export type Styles_On_Conflict = {
  constraint: Styles_Constraint;
  update_columns?: Array<Styles_Update_Column>;
  where?: InputMaybe<Styles_Bool_Exp>;
};

/** Ordering options when selecting data from "styles". */
export type Styles_Order_By = {
  channel?: InputMaybe<Order_By>;
  created_at?: InputMaybe<Order_By>;
  duration?: InputMaybe<Order_By>;
  error?: InputMaybe<Order_By>;
  height?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  job?: InputMaybe<Jobs_Order_By>;
  job_id?: InputMaybe<Order_By>;
  measured?: InputMaybe<Order_By>;
  recipe?: InputMaybe<Order_By>;
  ref_path?: InputMaybe<Order_By>;
  report?: InputMaybe<Order_By>;
  resolve_notes?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  thumb_path?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  updated_at?: InputMaybe<Order_By>;
  url?: InputMaybe<Order_By>;
  width?: InputMaybe<Order_By>;
  youtube_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: styles */
export type Styles_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Styles_Prepend_Input = {
  measured?: InputMaybe<Scalars['jsonb']['input']>;
  recipe?: InputMaybe<Scalars['jsonb']['input']>;
  report?: InputMaybe<Scalars['jsonb']['input']>;
};

/** select columns of table "styles" */
export enum Styles_Select_Column {
  /** column name */
  Channel = 'channel',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Duration = 'duration',
  /** column name */
  Error = 'error',
  /** column name */
  Height = 'height',
  /** column name */
  Id = 'id',
  /** column name */
  JobId = 'job_id',
  /** column name */
  Measured = 'measured',
  /** column name */
  Recipe = 'recipe',
  /** column name */
  RefPath = 'ref_path',
  /** column name */
  Report = 'report',
  /** column name */
  ResolveNotes = 'resolve_notes',
  /** column name */
  Status = 'status',
  /** column name */
  ThumbPath = 'thumb_path',
  /** column name */
  Title = 'title',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  Url = 'url',
  /** column name */
  Width = 'width',
  /** column name */
  YoutubeId = 'youtube_id'
}

/** input type for updating data in table "styles" */
export type Styles_Set_Input = {
  channel?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  duration?: InputMaybe<Scalars['Float']['input']>;
  error?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  job_id?: InputMaybe<Scalars['uuid']['input']>;
  measured?: InputMaybe<Scalars['jsonb']['input']>;
  recipe?: InputMaybe<Scalars['jsonb']['input']>;
  ref_path?: InputMaybe<Scalars['String']['input']>;
  report?: InputMaybe<Scalars['jsonb']['input']>;
  resolve_notes?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  thumb_path?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
  youtube_id?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate stddev on columns */
export type Styles_Stddev_Fields = {
  __typename?: 'styles_stddev_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Styles_Stddev_Pop_Fields = {
  __typename?: 'styles_stddev_pop_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Styles_Stddev_Samp_Fields = {
  __typename?: 'styles_stddev_samp_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "styles" */
export type Styles_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Styles_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Styles_Stream_Cursor_Value_Input = {
  channel?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  duration?: InputMaybe<Scalars['Float']['input']>;
  error?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  job_id?: InputMaybe<Scalars['uuid']['input']>;
  measured?: InputMaybe<Scalars['jsonb']['input']>;
  recipe?: InputMaybe<Scalars['jsonb']['input']>;
  ref_path?: InputMaybe<Scalars['String']['input']>;
  report?: InputMaybe<Scalars['jsonb']['input']>;
  resolve_notes?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  thumb_path?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  updated_at?: InputMaybe<Scalars['timestamptz']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
  youtube_id?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate sum on columns */
export type Styles_Sum_Fields = {
  __typename?: 'styles_sum_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};

/** update columns of table "styles" */
export enum Styles_Update_Column {
  /** column name */
  Channel = 'channel',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Duration = 'duration',
  /** column name */
  Error = 'error',
  /** column name */
  Height = 'height',
  /** column name */
  Id = 'id',
  /** column name */
  JobId = 'job_id',
  /** column name */
  Measured = 'measured',
  /** column name */
  Recipe = 'recipe',
  /** column name */
  RefPath = 'ref_path',
  /** column name */
  Report = 'report',
  /** column name */
  ResolveNotes = 'resolve_notes',
  /** column name */
  Status = 'status',
  /** column name */
  ThumbPath = 'thumb_path',
  /** column name */
  Title = 'title',
  /** column name */
  UpdatedAt = 'updated_at',
  /** column name */
  Url = 'url',
  /** column name */
  Width = 'width',
  /** column name */
  YoutubeId = 'youtube_id'
}

export type Styles_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Styles_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Styles_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Styles_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Styles_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Styles_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Styles_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Styles_Set_Input>;
  /** filter the rows which have to be updated */
  where: Styles_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Styles_Var_Pop_Fields = {
  __typename?: 'styles_var_pop_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Styles_Var_Samp_Fields = {
  __typename?: 'styles_var_samp_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Styles_Variance_Fields = {
  __typename?: 'styles_variance_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

export type Subscription_Root = {
  __typename?: 'subscription_root';
  /** An array relationship */
  assets: Array<Assets>;
  /** An aggregate relationship */
  assets_aggregate: Assets_Aggregate;
  /** fetch data from the table: "assets" using primary key columns */
  assets_by_pk?: Maybe<Assets>;
  /** fetch data from the table in a streaming manner: "assets" */
  assets_stream: Array<Assets>;
  /** An array relationship */
  clips: Array<Clips>;
  /** An aggregate relationship */
  clips_aggregate: Clips_Aggregate;
  /** fetch data from the table: "clips" using primary key columns */
  clips_by_pk?: Maybe<Clips>;
  /** fetch data from the table in a streaming manner: "clips" */
  clips_stream: Array<Clips>;
  /** An array relationship */
  jobs: Array<Jobs>;
  /** An aggregate relationship */
  jobs_aggregate: Jobs_Aggregate;
  /** fetch data from the table: "jobs" using primary key columns */
  jobs_by_pk?: Maybe<Jobs>;
  /** fetch data from the table in a streaming manner: "jobs" */
  jobs_stream: Array<Jobs>;
  /** fetch data from the table: "machines" */
  machines: Array<Machines>;
  /** fetch aggregated fields from the table: "machines" */
  machines_aggregate: Machines_Aggregate;
  /** fetch data from the table: "machines" using primary key columns */
  machines_by_pk?: Maybe<Machines>;
  /** fetch data from the table in a streaming manner: "machines" */
  machines_stream: Array<Machines>;
  /** fetch data from the table: "recipes" */
  recipes: Array<Recipes>;
  /** fetch aggregated fields from the table: "recipes" */
  recipes_aggregate: Recipes_Aggregate;
  /** fetch data from the table: "recipes" using primary key columns */
  recipes_by_pk?: Maybe<Recipes>;
  /** fetch data from the table in a streaming manner: "recipes" */
  recipes_stream: Array<Recipes>;
  /** fetch data from the table: "styles" */
  styles: Array<Styles>;
  /** fetch aggregated fields from the table: "styles" */
  styles_aggregate: Styles_Aggregate;
  /** fetch data from the table: "styles" using primary key columns */
  styles_by_pk?: Maybe<Styles>;
  /** fetch data from the table in a streaming manner: "styles" */
  styles_stream: Array<Styles>;
  /** fetch data from the table: "videos" */
  videos: Array<Videos>;
  /** fetch aggregated fields from the table: "videos" */
  videos_aggregate: Videos_Aggregate;
  /** fetch data from the table: "videos" using primary key columns */
  videos_by_pk?: Maybe<Videos>;
  /** fetch data from the table in a streaming manner: "videos" */
  videos_stream: Array<Videos>;
};


export type Subscription_RootAssetsArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


export type Subscription_RootAssets_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


export type Subscription_RootAssets_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootAssets_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Assets_Stream_Cursor_Input>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


export type Subscription_RootClipsArgs = {
  distinct_on?: InputMaybe<Array<Clips_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Clips_Order_By>>;
  where?: InputMaybe<Clips_Bool_Exp>;
};


export type Subscription_RootClips_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Clips_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Clips_Order_By>>;
  where?: InputMaybe<Clips_Bool_Exp>;
};


export type Subscription_RootClips_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootClips_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Clips_Stream_Cursor_Input>>;
  where?: InputMaybe<Clips_Bool_Exp>;
};


export type Subscription_RootJobsArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


export type Subscription_RootJobs_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


export type Subscription_RootJobs_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootJobs_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Jobs_Stream_Cursor_Input>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


export type Subscription_RootMachinesArgs = {
  distinct_on?: InputMaybe<Array<Machines_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Machines_Order_By>>;
  where?: InputMaybe<Machines_Bool_Exp>;
};


export type Subscription_RootMachines_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Machines_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Machines_Order_By>>;
  where?: InputMaybe<Machines_Bool_Exp>;
};


export type Subscription_RootMachines_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootMachines_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Machines_Stream_Cursor_Input>>;
  where?: InputMaybe<Machines_Bool_Exp>;
};


export type Subscription_RootRecipesArgs = {
  distinct_on?: InputMaybe<Array<Recipes_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Recipes_Order_By>>;
  where?: InputMaybe<Recipes_Bool_Exp>;
};


export type Subscription_RootRecipes_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Recipes_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Recipes_Order_By>>;
  where?: InputMaybe<Recipes_Bool_Exp>;
};


export type Subscription_RootRecipes_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootRecipes_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Recipes_Stream_Cursor_Input>>;
  where?: InputMaybe<Recipes_Bool_Exp>;
};


export type Subscription_RootStylesArgs = {
  distinct_on?: InputMaybe<Array<Styles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Styles_Order_By>>;
  where?: InputMaybe<Styles_Bool_Exp>;
};


export type Subscription_RootStyles_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Styles_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Styles_Order_By>>;
  where?: InputMaybe<Styles_Bool_Exp>;
};


export type Subscription_RootStyles_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootStyles_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Styles_Stream_Cursor_Input>>;
  where?: InputMaybe<Styles_Bool_Exp>;
};


export type Subscription_RootVideosArgs = {
  distinct_on?: InputMaybe<Array<Videos_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Videos_Order_By>>;
  where?: InputMaybe<Videos_Bool_Exp>;
};


export type Subscription_RootVideos_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Videos_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Videos_Order_By>>;
  where?: InputMaybe<Videos_Bool_Exp>;
};


export type Subscription_RootVideos_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootVideos_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Videos_Stream_Cursor_Input>>;
  where?: InputMaybe<Videos_Bool_Exp>;
};

/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
export type Timestamptz_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['timestamptz']['input']>;
  _gt?: InputMaybe<Scalars['timestamptz']['input']>;
  _gte?: InputMaybe<Scalars['timestamptz']['input']>;
  _in?: InputMaybe<Array<Scalars['timestamptz']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['timestamptz']['input']>;
  _lte?: InputMaybe<Scalars['timestamptz']['input']>;
  _neq?: InputMaybe<Scalars['timestamptz']['input']>;
  _nin?: InputMaybe<Array<Scalars['timestamptz']['input']>>;
};

/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
export type Uuid_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['uuid']['input']>;
  _gt?: InputMaybe<Scalars['uuid']['input']>;
  _gte?: InputMaybe<Scalars['uuid']['input']>;
  _in?: InputMaybe<Array<Scalars['uuid']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['uuid']['input']>;
  _lte?: InputMaybe<Scalars['uuid']['input']>;
  _neq?: InputMaybe<Scalars['uuid']['input']>;
  _nin?: InputMaybe<Array<Scalars['uuid']['input']>>;
};

/** columns and relationships of "videos" */
export type Videos = {
  __typename?: 'videos';
  /** An array relationship */
  assets: Array<Assets>;
  /** An aggregate relationship */
  assets_aggregate: Assets_Aggregate;
  channel?: Maybe<Scalars['String']['output']>;
  /** An array relationship */
  clips: Array<Clips>;
  /** An aggregate relationship */
  clips_aggregate: Clips_Aggregate;
  created_at: Scalars['timestamptz']['output'];
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['uuid']['output'];
  /** An array relationship */
  jobs: Array<Jobs>;
  /** An aggregate relationship */
  jobs_aggregate: Jobs_Aggregate;
  meta: Scalars['jsonb']['output'];
  note?: Maybe<Scalars['String']['output']>;
  pipeline: Scalars['String']['output'];
  size_bytes?: Maybe<Scalars['bigint']['output']>;
  source: Scalars['String']['output'];
  status: Scalars['String']['output'];
  storage_path?: Maybe<Scalars['String']['output']>;
  thumb_path?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
  vcodec?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
  youtube_id?: Maybe<Scalars['String']['output']>;
};


/** columns and relationships of "videos" */
export type VideosAssetsArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


/** columns and relationships of "videos" */
export type VideosAssets_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Assets_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Assets_Order_By>>;
  where?: InputMaybe<Assets_Bool_Exp>;
};


/** columns and relationships of "videos" */
export type VideosClipsArgs = {
  distinct_on?: InputMaybe<Array<Clips_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Clips_Order_By>>;
  where?: InputMaybe<Clips_Bool_Exp>;
};


/** columns and relationships of "videos" */
export type VideosClips_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Clips_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Clips_Order_By>>;
  where?: InputMaybe<Clips_Bool_Exp>;
};


/** columns and relationships of "videos" */
export type VideosJobsArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


/** columns and relationships of "videos" */
export type VideosJobs_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Jobs_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Jobs_Order_By>>;
  where?: InputMaybe<Jobs_Bool_Exp>;
};


/** columns and relationships of "videos" */
export type VideosMetaArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "videos" */
export type Videos_Aggregate = {
  __typename?: 'videos_aggregate';
  aggregate?: Maybe<Videos_Aggregate_Fields>;
  nodes: Array<Videos>;
};

/** aggregate fields of "videos" */
export type Videos_Aggregate_Fields = {
  __typename?: 'videos_aggregate_fields';
  avg?: Maybe<Videos_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Videos_Max_Fields>;
  min?: Maybe<Videos_Min_Fields>;
  stddev?: Maybe<Videos_Stddev_Fields>;
  stddev_pop?: Maybe<Videos_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Videos_Stddev_Samp_Fields>;
  sum?: Maybe<Videos_Sum_Fields>;
  var_pop?: Maybe<Videos_Var_Pop_Fields>;
  var_samp?: Maybe<Videos_Var_Samp_Fields>;
  variance?: Maybe<Videos_Variance_Fields>;
};


/** aggregate fields of "videos" */
export type Videos_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Videos_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Videos_Append_Input = {
  meta?: InputMaybe<Scalars['jsonb']['input']>;
};

/** aggregate avg on columns */
export type Videos_Avg_Fields = {
  __typename?: 'videos_avg_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "videos". All fields are combined with a logical 'AND'. */
export type Videos_Bool_Exp = {
  _and?: InputMaybe<Array<Videos_Bool_Exp>>;
  _not?: InputMaybe<Videos_Bool_Exp>;
  _or?: InputMaybe<Array<Videos_Bool_Exp>>;
  assets?: InputMaybe<Assets_Bool_Exp>;
  assets_aggregate?: InputMaybe<Assets_Aggregate_Bool_Exp>;
  channel?: InputMaybe<String_Comparison_Exp>;
  clips?: InputMaybe<Clips_Bool_Exp>;
  clips_aggregate?: InputMaybe<Clips_Aggregate_Bool_Exp>;
  created_at?: InputMaybe<Timestamptz_Comparison_Exp>;
  duration?: InputMaybe<Float_Comparison_Exp>;
  height?: InputMaybe<Int_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  jobs?: InputMaybe<Jobs_Bool_Exp>;
  jobs_aggregate?: InputMaybe<Jobs_Aggregate_Bool_Exp>;
  meta?: InputMaybe<Jsonb_Comparison_Exp>;
  note?: InputMaybe<String_Comparison_Exp>;
  pipeline?: InputMaybe<String_Comparison_Exp>;
  size_bytes?: InputMaybe<Bigint_Comparison_Exp>;
  source?: InputMaybe<String_Comparison_Exp>;
  status?: InputMaybe<String_Comparison_Exp>;
  storage_path?: InputMaybe<String_Comparison_Exp>;
  thumb_path?: InputMaybe<String_Comparison_Exp>;
  title?: InputMaybe<String_Comparison_Exp>;
  url?: InputMaybe<String_Comparison_Exp>;
  vcodec?: InputMaybe<String_Comparison_Exp>;
  width?: InputMaybe<Int_Comparison_Exp>;
  youtube_id?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "videos" */
export enum Videos_Constraint {
  /** unique or primary key constraint on columns "id" */
  VideosPkey = 'videos_pkey',
  /** unique or primary key constraint on columns "youtube_id" */
  VideosYoutubeIdKey = 'videos_youtube_id_key'
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Videos_Delete_At_Path_Input = {
  meta?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Videos_Delete_Elem_Input = {
  meta?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Videos_Delete_Key_Input = {
  meta?: InputMaybe<Scalars['String']['input']>;
};

/** input type for incrementing numeric columns in table "videos" */
export type Videos_Inc_Input = {
  duration?: InputMaybe<Scalars['Float']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  size_bytes?: InputMaybe<Scalars['bigint']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** input type for inserting data into table "videos" */
export type Videos_Insert_Input = {
  assets?: InputMaybe<Assets_Arr_Rel_Insert_Input>;
  channel?: InputMaybe<Scalars['String']['input']>;
  clips?: InputMaybe<Clips_Arr_Rel_Insert_Input>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  duration?: InputMaybe<Scalars['Float']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  jobs?: InputMaybe<Jobs_Arr_Rel_Insert_Input>;
  meta?: InputMaybe<Scalars['jsonb']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  pipeline?: InputMaybe<Scalars['String']['input']>;
  size_bytes?: InputMaybe<Scalars['bigint']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  storage_path?: InputMaybe<Scalars['String']['input']>;
  thumb_path?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  vcodec?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
  youtube_id?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate max on columns */
export type Videos_Max_Fields = {
  __typename?: 'videos_max_fields';
  channel?: Maybe<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  note?: Maybe<Scalars['String']['output']>;
  pipeline?: Maybe<Scalars['String']['output']>;
  size_bytes?: Maybe<Scalars['bigint']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  storage_path?: Maybe<Scalars['String']['output']>;
  thumb_path?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  vcodec?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
  youtube_id?: Maybe<Scalars['String']['output']>;
};

/** aggregate min on columns */
export type Videos_Min_Fields = {
  __typename?: 'videos_min_fields';
  channel?: Maybe<Scalars['String']['output']>;
  created_at?: Maybe<Scalars['timestamptz']['output']>;
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  note?: Maybe<Scalars['String']['output']>;
  pipeline?: Maybe<Scalars['String']['output']>;
  size_bytes?: Maybe<Scalars['bigint']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  storage_path?: Maybe<Scalars['String']['output']>;
  thumb_path?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  vcodec?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
  youtube_id?: Maybe<Scalars['String']['output']>;
};

/** response of any mutation on the table "videos" */
export type Videos_Mutation_Response = {
  __typename?: 'videos_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Videos>;
};

/** input type for inserting object relation for remote table "videos" */
export type Videos_Obj_Rel_Insert_Input = {
  data: Videos_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Videos_On_Conflict>;
};

/** on_conflict condition type for table "videos" */
export type Videos_On_Conflict = {
  constraint: Videos_Constraint;
  update_columns?: Array<Videos_Update_Column>;
  where?: InputMaybe<Videos_Bool_Exp>;
};

/** Ordering options when selecting data from "videos". */
export type Videos_Order_By = {
  assets_aggregate?: InputMaybe<Assets_Aggregate_Order_By>;
  channel?: InputMaybe<Order_By>;
  clips_aggregate?: InputMaybe<Clips_Aggregate_Order_By>;
  created_at?: InputMaybe<Order_By>;
  duration?: InputMaybe<Order_By>;
  height?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  jobs_aggregate?: InputMaybe<Jobs_Aggregate_Order_By>;
  meta?: InputMaybe<Order_By>;
  note?: InputMaybe<Order_By>;
  pipeline?: InputMaybe<Order_By>;
  size_bytes?: InputMaybe<Order_By>;
  source?: InputMaybe<Order_By>;
  status?: InputMaybe<Order_By>;
  storage_path?: InputMaybe<Order_By>;
  thumb_path?: InputMaybe<Order_By>;
  title?: InputMaybe<Order_By>;
  url?: InputMaybe<Order_By>;
  vcodec?: InputMaybe<Order_By>;
  width?: InputMaybe<Order_By>;
  youtube_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: videos */
export type Videos_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Videos_Prepend_Input = {
  meta?: InputMaybe<Scalars['jsonb']['input']>;
};

/** select columns of table "videos" */
export enum Videos_Select_Column {
  /** column name */
  Channel = 'channel',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Duration = 'duration',
  /** column name */
  Height = 'height',
  /** column name */
  Id = 'id',
  /** column name */
  Meta = 'meta',
  /** column name */
  Note = 'note',
  /** column name */
  Pipeline = 'pipeline',
  /** column name */
  SizeBytes = 'size_bytes',
  /** column name */
  Source = 'source',
  /** column name */
  Status = 'status',
  /** column name */
  StoragePath = 'storage_path',
  /** column name */
  ThumbPath = 'thumb_path',
  /** column name */
  Title = 'title',
  /** column name */
  Url = 'url',
  /** column name */
  Vcodec = 'vcodec',
  /** column name */
  Width = 'width',
  /** column name */
  YoutubeId = 'youtube_id'
}

/** input type for updating data in table "videos" */
export type Videos_Set_Input = {
  channel?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  duration?: InputMaybe<Scalars['Float']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  meta?: InputMaybe<Scalars['jsonb']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  pipeline?: InputMaybe<Scalars['String']['input']>;
  size_bytes?: InputMaybe<Scalars['bigint']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  storage_path?: InputMaybe<Scalars['String']['input']>;
  thumb_path?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  vcodec?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
  youtube_id?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate stddev on columns */
export type Videos_Stddev_Fields = {
  __typename?: 'videos_stddev_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Videos_Stddev_Pop_Fields = {
  __typename?: 'videos_stddev_pop_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Videos_Stddev_Samp_Fields = {
  __typename?: 'videos_stddev_samp_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "videos" */
export type Videos_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Videos_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Videos_Stream_Cursor_Value_Input = {
  channel?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['timestamptz']['input']>;
  duration?: InputMaybe<Scalars['Float']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  meta?: InputMaybe<Scalars['jsonb']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  pipeline?: InputMaybe<Scalars['String']['input']>;
  size_bytes?: InputMaybe<Scalars['bigint']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  storage_path?: InputMaybe<Scalars['String']['input']>;
  thumb_path?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  vcodec?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
  youtube_id?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate sum on columns */
export type Videos_Sum_Fields = {
  __typename?: 'videos_sum_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  size_bytes?: Maybe<Scalars['bigint']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};

/** update columns of table "videos" */
export enum Videos_Update_Column {
  /** column name */
  Channel = 'channel',
  /** column name */
  CreatedAt = 'created_at',
  /** column name */
  Duration = 'duration',
  /** column name */
  Height = 'height',
  /** column name */
  Id = 'id',
  /** column name */
  Meta = 'meta',
  /** column name */
  Note = 'note',
  /** column name */
  Pipeline = 'pipeline',
  /** column name */
  SizeBytes = 'size_bytes',
  /** column name */
  Source = 'source',
  /** column name */
  Status = 'status',
  /** column name */
  StoragePath = 'storage_path',
  /** column name */
  ThumbPath = 'thumb_path',
  /** column name */
  Title = 'title',
  /** column name */
  Url = 'url',
  /** column name */
  Vcodec = 'vcodec',
  /** column name */
  Width = 'width',
  /** column name */
  YoutubeId = 'youtube_id'
}

export type Videos_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Videos_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Videos_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Videos_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Videos_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Videos_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Videos_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Videos_Set_Input>;
  /** filter the rows which have to be updated */
  where: Videos_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Videos_Var_Pop_Fields = {
  __typename?: 'videos_var_pop_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Videos_Var_Samp_Fields = {
  __typename?: 'videos_var_samp_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Videos_Variance_Fields = {
  __typename?: 'videos_variance_fields';
  duration?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  size_bytes?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

export type ProbeUrlMutationVariables = Exact<{
  url: Scalars['String']['input'];
}>;


export type ProbeUrlMutation = { __typename?: 'mutation_root', probe_url?: { __typename?: 'ProbeResult', title?: string | null, uploader?: string | null, duration?: number | null, thumbnail?: string | null, webpage_url?: string | null, heights: Array<number>, hdr: boolean, youtube_id?: string | null, existing_video_id?: string | null } | null };

export type StartDownloadMutationVariables = Exact<{
  url: Scalars['String']['input'];
  quality: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
  youtube_id?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  pipeline?: InputMaybe<Scalars['String']['input']>;
}>;


export type StartDownloadMutation = { __typename?: 'mutation_root', start_download?: { __typename?: 'StartDownloadOutput', video_id: string, job_id?: string | null, existing: boolean } | null };

export type EnqueueMutationVariables = Exact<{
  type: Scalars['String']['input'];
  video_id?: InputMaybe<Scalars['uuid']['input']>;
  clip_id?: InputMaybe<Scalars['uuid']['input']>;
  payload?: InputMaybe<Scalars['jsonb']['input']>;
}>;


export type EnqueueMutation = { __typename?: 'mutation_root', enqueue_job?: { __typename?: 'EnqueueOutput', job_id: string } | null };

export type WakeMachineMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type WakeMachineMutation = { __typename?: 'mutation_root', wake_machine?: { __typename?: 'WakeOutput', ok: boolean, message?: string | null } | null };

export type JobsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type JobsSubscription = { __typename?: 'subscription_root', jobs: Array<{ __typename?: 'jobs', id: string, type: string, status: string, priority: number, progress?: number | null, progress_note?: string | null, error?: string | null, attempts: number, max_attempts: number, created_at: string, updated_at: string, claimed_at?: string | null, result?: unknown | null, machine?: { __typename?: 'machines', id: string, name: string } | null, video?: { __typename?: 'videos', id: string, title: string } | null, clip?: { __typename?: 'clips', id: string, title?: string | null, start_s: number, end_s: number } | null }> };

export type SetJobStatusMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
  status: Scalars['String']['input'];
}>;


export type SetJobStatusMutation = { __typename?: 'mutation_root', update_jobs_by_pk?: { __typename?: 'jobs', id: string, status: string } | null };

export type RetryJobMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
}>;


export type RetryJobMutation = { __typename?: 'mutation_root', update_jobs_by_pk?: { __typename?: 'jobs', id: string, status: string } | null };

export type ClearFinishedJobsMutationVariables = Exact<{ [key: string]: never; }>;


export type ClearFinishedJobsMutation = { __typename?: 'mutation_root', delete_jobs?: { __typename?: 'jobs_mutation_response', affected_rows: number } | null };

export type EnqueueJobMutationVariables = Exact<{
  type: Scalars['String']['input'];
  video_id?: InputMaybe<Scalars['uuid']['input']>;
  payload?: InputMaybe<Scalars['jsonb']['input']>;
}>;


export type EnqueueJobMutation = { __typename?: 'mutation_root', insert_jobs_one?: { __typename?: 'jobs', id: string } | null };

export type MachinesSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type MachinesSubscription = { __typename?: 'subscription_root', machines: Array<{ __typename?: 'machines', id: string, name: string, os?: string | null, capabilities: Array<string>, fallback: Array<string>, supported: Array<string>, paused: boolean, status: string, tailscale_ip?: string | null, mac_address?: string | null, last_seen_at?: string | null, woken_at?: string | null }> };

export type UpdateMachineMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
  capabilities?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  fallback?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  paused?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type UpdateMachineMutation = { __typename?: 'mutation_root', update_machines_by_pk?: { __typename?: 'machines', id: string, capabilities: Array<string>, fallback: Array<string>, paused: boolean } | null };

export type RecipesSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type RecipesSubscription = { __typename?: 'subscription_root', recipes: Array<{ __typename?: 'recipes', id: string, name: string, description?: string | null, settings: unknown, auto_apply: boolean, created_at: string, updated_at: string, clips_aggregate: { __typename?: 'clips_aggregate', aggregate?: { __typename?: 'clips_aggregate_fields', count: number } | null } }> };

export type InsertRecipeMutationVariables = Exact<{
  name: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  settings: Scalars['jsonb']['input'];
  auto_apply: Scalars['Boolean']['input'];
}>;


export type InsertRecipeMutation = { __typename?: 'mutation_root', insert_recipes_one?: { __typename?: 'recipes', id: string } | null };

export type UpdateRecipeMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  settings?: InputMaybe<Scalars['jsonb']['input']>;
  auto_apply?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type UpdateRecipeMutation = { __typename?: 'mutation_root', update_recipes_by_pk?: { __typename?: 'recipes', id: string } | null };

export type DeleteRecipeMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
}>;


export type DeleteRecipeMutation = { __typename?: 'mutation_root', delete_recipes_by_pk?: { __typename?: 'recipes', id: string } | null };

export type ReviewClipsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type ReviewClipsSubscription = { __typename?: 'subscription_root', clips: Array<{ __typename?: 'clips', id: string, start_s: number, end_s: number, title?: string | null, hook?: string | null, reason?: string | null, origin: string, status: string, output_path?: string | null, render_settings?: unknown | null, updated_at: string, recipe?: { __typename?: 'recipes', id: string, name: string } | null, video: { __typename?: 'videos', id: string, title: string, note?: string | null, assets: Array<{ __typename?: 'assets', data?: unknown | null }> } }> };

export type ReviewCountSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type ReviewCountSubscription = { __typename?: 'subscription_root', clips_aggregate: { __typename?: 'clips_aggregate', aggregate?: { __typename?: 'clips_aggregate_fields', count: number } | null } };

export type StylesSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type StylesSubscription = { __typename?: 'subscription_root', styles: Array<{ __typename?: 'styles', id: string, url: string, youtube_id?: string | null, title?: string | null, channel?: string | null, duration?: number | null, width?: number | null, height?: number | null, ref_path?: string | null, thumb_path?: string | null, status: string, error?: string | null, measured?: unknown | null, report?: unknown | null, recipe?: unknown | null, resolve_notes?: string | null, created_at: string, job?: { __typename?: 'jobs', id: string, status: string, progress?: number | null, progress_note?: string | null } | null }> };

export type AnalyzeStyleMutationVariables = Exact<{
  url: Scalars['String']['input'];
}>;


export type AnalyzeStyleMutation = { __typename?: 'mutation_root', analyze_style?: { __typename?: 'AnalyzeStyleOutput', style_id: string, job_id?: string | null, existing: boolean } | null };

export type DeleteStyleMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
}>;


export type DeleteStyleMutation = { __typename?: 'mutation_root', delete_styles_by_pk?: { __typename?: 'styles', id: string } | null };

export type LibrarySubscriptionVariables = Exact<{ [key: string]: never; }>;


export type LibrarySubscription = { __typename?: 'subscription_root', videos: Array<{ __typename?: 'videos', id: string, title: string, channel?: string | null, duration?: number | null, width?: number | null, height?: number | null, vcodec?: string | null, status: string, pipeline: string, note?: string | null, storage_path?: string | null, thumb_path?: string | null, size_bytes?: any | null, created_at: string, assets: Array<{ __typename?: 'assets', id: string, kind: string, data?: unknown | null }>, clips_aggregate: { __typename?: 'clips_aggregate', aggregate?: { __typename?: 'clips_aggregate_fields', count: number } | null }, rendered: { __typename?: 'clips_aggregate', aggregate?: { __typename?: 'clips_aggregate_fields', count: number } | null }, jobs: Array<{ __typename?: 'jobs', id: string, type: string, status: string, progress?: number | null, progress_note?: string | null }> }> };

export type VideoDetailSubscriptionVariables = Exact<{
  id: Scalars['uuid']['input'];
}>;


export type VideoDetailSubscription = { __typename?: 'subscription_root', videos_by_pk?: { __typename?: 'videos', id: string, title: string, channel?: string | null, duration?: number | null, width?: number | null, height?: number | null, vcodec?: string | null, status: string, pipeline: string, note?: string | null, url?: string | null, storage_path?: string | null, thumb_path?: string | null, size_bytes?: any | null, created_at: string, assets: Array<{ __typename?: 'assets', id: string, kind: string, path?: string | null, data?: unknown | null, created_at: string }>, clips: Array<{ __typename?: 'clips', id: string, start_s: number, end_s: number, title?: string | null, hook?: string | null, reason?: string | null, origin: string, status: string, output_path?: string | null, render_settings?: unknown | null, created_at: string }>, jobs: Array<{ __typename?: 'jobs', id: string, type: string, status: string, progress?: number | null, progress_note?: string | null, error?: string | null, clip_id?: string | null, created_at: string }> } | null };

export type UpdateVideoMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  pipeline?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateVideoMutation = { __typename?: 'mutation_root', update_videos_by_pk?: { __typename?: 'videos', id: string, note?: string | null, pipeline: string } | null };

export type DeleteVideoMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
}>;


export type DeleteVideoMutation = { __typename?: 'mutation_root', delete_videos_by_pk?: { __typename?: 'videos', id: string } | null };

export type SetClipStatusMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
  status: Scalars['String']['input'];
}>;


export type SetClipStatusMutation = { __typename?: 'mutation_root', update_clips_by_pk?: { __typename?: 'clips', id: string, status: string } | null };

export type DeleteClipMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
}>;


export type DeleteClipMutation = { __typename?: 'mutation_root', delete_clips_by_pk?: { __typename?: 'clips', id: string } | null };

export type InsertClipMutationVariables = Exact<{
  video_id: Scalars['uuid']['input'];
  start_s: Scalars['Float']['input'];
  end_s: Scalars['Float']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
}>;


export type InsertClipMutation = { __typename?: 'mutation_root', insert_clips_one?: { __typename?: 'clips', id: string } | null };


export const ProbeUrlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProbeUrl"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"probe_url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"uploader"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnail"}},{"kind":"Field","name":{"kind":"Name","value":"webpage_url"}},{"kind":"Field","name":{"kind":"Name","value":"heights"}},{"kind":"Field","name":{"kind":"Name","value":"hdr"}},{"kind":"Field","name":{"kind":"Name","value":"youtube_id"}},{"kind":"Field","name":{"kind":"Name","value":"existing_video_id"}}]}}]}}]} as unknown as DocumentNode<ProbeUrlMutation, ProbeUrlMutationVariables>;
export const StartDownloadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StartDownload"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"quality"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"youtube_id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"note"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"pipeline"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start_download"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}},{"kind":"Argument","name":{"kind":"Name","value":"quality"},"value":{"kind":"Variable","name":{"kind":"Name","value":"quality"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"youtube_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"youtube_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"note"},"value":{"kind":"Variable","name":{"kind":"Name","value":"note"}}},{"kind":"Argument","name":{"kind":"Name","value":"pipeline"},"value":{"kind":"Variable","name":{"kind":"Name","value":"pipeline"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"video_id"}},{"kind":"Field","name":{"kind":"Name","value":"job_id"}},{"kind":"Field","name":{"kind":"Name","value":"existing"}}]}}]}}]} as unknown as DocumentNode<StartDownloadMutation, StartDownloadMutationVariables>;
export const EnqueueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Enqueue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"video_id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"clip_id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"payload"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"jsonb"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"enqueue_job"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}},{"kind":"Argument","name":{"kind":"Name","value":"video_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"video_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"clip_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"clip_id"}}},{"kind":"Argument","name":{"kind":"Name","value":"payload"},"value":{"kind":"Variable","name":{"kind":"Name","value":"payload"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"job_id"}}]}}]}}]} as unknown as DocumentNode<EnqueueMutation, EnqueueMutationVariables>;
export const WakeMachineDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"WakeMachine"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"wake_machine"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ok"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<WakeMachineMutation, WakeMachineMutationVariables>;
export const JobsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"Jobs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"jobs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"created_at"},"value":{"kind":"EnumValue","value":"desc"}}]}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"60"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"priority"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"progress_note"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"attempts"}},{"kind":"Field","name":{"kind":"Name","value":"max_attempts"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"claimed_at"}},{"kind":"Field","name":{"kind":"Name","value":"result"}},{"kind":"Field","name":{"kind":"Name","value":"machine"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"video"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}},{"kind":"Field","name":{"kind":"Name","value":"clip"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"start_s"}},{"kind":"Field","name":{"kind":"Name","value":"end_s"}}]}}]}}]}}]} as unknown as DocumentNode<JobsSubscription, JobsSubscriptionVariables>;
export const SetJobStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetJobStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"update_jobs_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pk_columns"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_set"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<SetJobStatusMutation, SetJobStatusMutationVariables>;
export const RetryJobDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RetryJob"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"update_jobs_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pk_columns"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_set"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"status"},"value":{"kind":"StringValue","value":"queued","block":false}},{"kind":"ObjectField","name":{"kind":"Name","value":"error"},"value":{"kind":"NullValue"}},{"kind":"ObjectField","name":{"kind":"Name","value":"progress"},"value":{"kind":"NullValue"}},{"kind":"ObjectField","name":{"kind":"Name","value":"progress_note"},"value":{"kind":"NullValue"}},{"kind":"ObjectField","name":{"kind":"Name","value":"claimed_by"},"value":{"kind":"NullValue"}},{"kind":"ObjectField","name":{"kind":"Name","value":"claimed_at"},"value":{"kind":"NullValue"}},{"kind":"ObjectField","name":{"kind":"Name","value":"heartbeat_at"},"value":{"kind":"NullValue"}},{"kind":"ObjectField","name":{"kind":"Name","value":"attempts"},"value":{"kind":"IntValue","value":"0"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<RetryJobMutation, RetryJobMutationVariables>;
export const ClearFinishedJobsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ClearFinishedJobs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"delete_jobs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"status"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_in"},"value":{"kind":"ListValue","values":[{"kind":"StringValue","value":"done","block":false},{"kind":"StringValue","value":"error","block":false},{"kind":"StringValue","value":"cancelled","block":false}]}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"affected_rows"}}]}}]}}]} as unknown as DocumentNode<ClearFinishedJobsMutation, ClearFinishedJobsMutationVariables>;
export const EnqueueJobDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EnqueueJob"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"video_id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"payload"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"jsonb"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insert_jobs_one"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"object"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"video_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"video_id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"payload"},"value":{"kind":"Variable","name":{"kind":"Name","value":"payload"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<EnqueueJobMutation, EnqueueJobMutationVariables>;
export const MachinesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"Machines"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"machines"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"EnumValue","value":"asc"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"os"}},{"kind":"Field","name":{"kind":"Name","value":"capabilities"}},{"kind":"Field","name":{"kind":"Name","value":"fallback"}},{"kind":"Field","name":{"kind":"Name","value":"supported"}},{"kind":"Field","name":{"kind":"Name","value":"paused"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"tailscale_ip"}},{"kind":"Field","name":{"kind":"Name","value":"mac_address"}},{"kind":"Field","name":{"kind":"Name","value":"last_seen_at"}},{"kind":"Field","name":{"kind":"Name","value":"woken_at"}}]}}]}}]} as unknown as DocumentNode<MachinesSubscription, MachinesSubscriptionVariables>;
export const UpdateMachineDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateMachine"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"capabilities"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"fallback"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"paused"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"update_machines_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pk_columns"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_set"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"capabilities"},"value":{"kind":"Variable","name":{"kind":"Name","value":"capabilities"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"fallback"},"value":{"kind":"Variable","name":{"kind":"Name","value":"fallback"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"paused"},"value":{"kind":"Variable","name":{"kind":"Name","value":"paused"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"capabilities"}},{"kind":"Field","name":{"kind":"Name","value":"fallback"}},{"kind":"Field","name":{"kind":"Name","value":"paused"}}]}}]}}]} as unknown as DocumentNode<UpdateMachineMutation, UpdateMachineMutationVariables>;
export const RecipesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"Recipes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recipes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"EnumValue","value":"asc"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"settings"}},{"kind":"Field","name":{"kind":"Name","value":"auto_apply"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"clips_aggregate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"aggregate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]}}]}}]} as unknown as DocumentNode<RecipesSubscription, RecipesSubscriptionVariables>;
export const InsertRecipeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InsertRecipe"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"settings"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"jsonb"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"auto_apply"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insert_recipes_one"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"object"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"settings"},"value":{"kind":"Variable","name":{"kind":"Name","value":"settings"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"auto_apply"},"value":{"kind":"Variable","name":{"kind":"Name","value":"auto_apply"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<InsertRecipeMutation, InsertRecipeMutationVariables>;
export const UpdateRecipeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateRecipe"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"settings"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"jsonb"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"auto_apply"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"update_recipes_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pk_columns"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_set"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"settings"},"value":{"kind":"Variable","name":{"kind":"Name","value":"settings"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"auto_apply"},"value":{"kind":"Variable","name":{"kind":"Name","value":"auto_apply"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateRecipeMutation, UpdateRecipeMutationVariables>;
export const DeleteRecipeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteRecipe"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"delete_recipes_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<DeleteRecipeMutation, DeleteRecipeMutationVariables>;
export const ReviewClipsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"ReviewClips"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"clips"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"status"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_in"},"value":{"kind":"ListValue","values":[{"kind":"StringValue","value":"rendered","block":false},{"kind":"StringValue","value":"approved","block":false}]}}]}},{"kind":"ObjectField","name":{"kind":"Name","value":"output_path"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_is_null"},"value":{"kind":"BooleanValue","value":false}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"updated_at"},"value":{"kind":"EnumValue","value":"desc"}}]}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"60"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"start_s"}},{"kind":"Field","name":{"kind":"Name","value":"end_s"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"hook"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"origin"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"output_path"}},{"kind":"Field","name":{"kind":"Name","value":"render_settings"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"recipe"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"video"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"assets"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"kind"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"StringValue","value":"postkit","block":false}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"data"}}]}}]}}]}}]}}]} as unknown as DocumentNode<ReviewClipsSubscription, ReviewClipsSubscriptionVariables>;
export const ReviewCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"ReviewCount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"clips_aggregate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"status"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"StringValue","value":"rendered","block":false}}]}},{"kind":"ObjectField","name":{"kind":"Name","value":"output_path"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_is_null"},"value":{"kind":"BooleanValue","value":false}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"aggregate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]}}]} as unknown as DocumentNode<ReviewCountSubscription, ReviewCountSubscriptionVariables>;
export const StylesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"Styles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"styles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"created_at"},"value":{"kind":"EnumValue","value":"desc"}}]}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"40"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"youtube_id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"channel"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"ref_path"}},{"kind":"Field","name":{"kind":"Name","value":"thumb_path"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"measured"}},{"kind":"Field","name":{"kind":"Name","value":"report"}},{"kind":"Field","name":{"kind":"Name","value":"recipe"}},{"kind":"Field","name":{"kind":"Name","value":"resolve_notes"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"job"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"progress_note"}}]}}]}}]}}]} as unknown as DocumentNode<StylesSubscription, StylesSubscriptionVariables>;
export const AnalyzeStyleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AnalyzeStyle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"analyze_style"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"style_id"}},{"kind":"Field","name":{"kind":"Name","value":"job_id"}},{"kind":"Field","name":{"kind":"Name","value":"existing"}}]}}]}}]} as unknown as DocumentNode<AnalyzeStyleMutation, AnalyzeStyleMutationVariables>;
export const DeleteStyleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteStyle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"delete_styles_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<DeleteStyleMutation, DeleteStyleMutationVariables>;
export const LibraryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"Library"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"videos"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"created_at"},"value":{"kind":"EnumValue","value":"desc"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"channel"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"vcodec"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"pipeline"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"storage_path"}},{"kind":"Field","name":{"kind":"Name","value":"thumb_path"}},{"kind":"Field","name":{"kind":"Name","value":"size_bytes"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"assets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"data"}}]}},{"kind":"Field","name":{"kind":"Name","value":"clips_aggregate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"aggregate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"rendered"},"name":{"kind":"Name","value":"clips_aggregate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"status"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_in"},"value":{"kind":"ListValue","values":[{"kind":"StringValue","value":"rendered","block":false},{"kind":"StringValue","value":"approved","block":false},{"kind":"StringValue","value":"posted","block":false}]}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"aggregate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"jobs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"status"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_in"},"value":{"kind":"ListValue","values":[{"kind":"StringValue","value":"queued","block":false},{"kind":"StringValue","value":"claimed","block":false},{"kind":"StringValue","value":"running","block":false},{"kind":"StringValue","value":"cancel_requested","block":false}]}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"created_at"},"value":{"kind":"EnumValue","value":"desc"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"progress_note"}}]}}]}}]}}]} as unknown as DocumentNode<LibrarySubscription, LibrarySubscriptionVariables>;
export const VideoDetailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"VideoDetail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"videos_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"channel"}},{"kind":"Field","name":{"kind":"Name","value":"duration"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"vcodec"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"pipeline"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"storage_path"}},{"kind":"Field","name":{"kind":"Name","value":"thumb_path"}},{"kind":"Field","name":{"kind":"Name","value":"size_bytes"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"assets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"data"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}},{"kind":"Field","name":{"kind":"Name","value":"clips"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"created_at"},"value":{"kind":"EnumValue","value":"asc"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"start_s"}},{"kind":"Field","name":{"kind":"Name","value":"end_s"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"hook"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"origin"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"output_path"}},{"kind":"Field","name":{"kind":"Name","value":"render_settings"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}},{"kind":"Field","name":{"kind":"Name","value":"jobs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"created_at"},"value":{"kind":"EnumValue","value":"desc"}}]}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"30"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"progress"}},{"kind":"Field","name":{"kind":"Name","value":"progress_note"}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"clip_id"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}}]}}]}}]} as unknown as DocumentNode<VideoDetailSubscription, VideoDetailSubscriptionVariables>;
export const UpdateVideoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateVideo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"note"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"pipeline"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"update_videos_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pk_columns"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_set"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"note"},"value":{"kind":"Variable","name":{"kind":"Name","value":"note"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"pipeline"},"value":{"kind":"Variable","name":{"kind":"Name","value":"pipeline"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"pipeline"}}]}}]}}]} as unknown as DocumentNode<UpdateVideoMutation, UpdateVideoMutationVariables>;
export const DeleteVideoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteVideo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"delete_videos_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<DeleteVideoMutation, DeleteVideoMutationVariables>;
export const SetClipStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetClipStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"update_clips_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pk_columns"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_set"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<SetClipStatusMutation, SetClipStatusMutationVariables>;
export const DeleteClipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteClip"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"delete_clips_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<DeleteClipMutation, DeleteClipMutationVariables>;
export const InsertClipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InsertClip"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"video_id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"start_s"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"end_s"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insert_clips_one"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"object"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"video_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"video_id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"start_s"},"value":{"kind":"Variable","name":{"kind":"Name","value":"start_s"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"end_s"},"value":{"kind":"Variable","name":{"kind":"Name","value":"end_s"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"origin"},"value":{"kind":"StringValue","value":"manual","block":false}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<InsertClipMutation, InsertClipMutationVariables>;